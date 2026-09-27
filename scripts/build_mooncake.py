"""Build the small, textured 3D mooncake used by the interactive scene.

Run with:
  /Applications/Blender.app/Contents/MacOS/Blender -b --python scripts/build_mooncake.py

The NoBug top image is mapped onto the solid scalloped body. Blender embeds the
source textures in the exported GLB.
"""

from math import cos, pi, sin
from pathlib import Path

import bpy


ROOT = Path(__file__).resolve().parents[1]
TOP = ROOT / "public/images/mooncake.png"
SIDE = ROOT / "public/textures/mooncake/side.jpg"
BOTTOM = ROOT / "public/textures/mooncake/bottom-baked.png"
OUTPUT = ROOT / "public/models/mooncake.glb"
SEGMENTS = 192
FLUTES = 16


def material(name, color, image=None, roughness=0.62):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    mat.node_tree.nodes.clear()
    output = mat.node_tree.nodes.new("ShaderNodeOutputMaterial")
    principled = mat.node_tree.nodes.new("ShaderNodeBsdfPrincipled")
    mat.node_tree.links.new(principled.outputs["BSDF"], output.inputs["Surface"])
    principled.inputs["Base Color"].default_value = (*color, 1)
    principled.inputs["Roughness"].default_value = roughness
    if image:
        texture = mat.node_tree.nodes.new("ShaderNodeTexImage")
        texture.image = bpy.data.images.load(str(image), check_existing=True)
        mat.node_tree.links.new(texture.outputs["Color"], principled.inputs["Base Color"])
    return mat


def add_mesh(name, vertices, faces, mat, uv_func=None):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    if uv_func:
        layer = mesh.uv_layers.new(name="UVMap")
        for polygon in mesh.polygons:
            for loop_index in polygon.loop_indices:
                vertex_index = mesh.loops[loop_index].vertex_index
                layer.data[loop_index].uv = uv_func(vertex_index, vertices[vertex_index])
    for polygon in mesh.polygons:
        polygon.use_smooth = name == "Fluted pastry wall"
    return obj


def scallop(angle):
    return 0.055 * cos(FLUTES * angle)


def make_side(mat):
    # The profile rounds the outer top/bottom edges; each ring shares a fluted rim.
    profile = [
        (1.48, -0.40),
        (1.57, -0.36),
        (1.64, -0.27),
        (1.65, 0.13),
        (1.60, 0.22),
        (1.56, 0.245),
    ]
    vertices = []
    faces = []
    stride = SEGMENTS + 1
    for radius, z in profile:
        for j in range(stride):
            angle = j / SEGMENTS * 2 * pi
            r = radius + scallop(angle)
            vertices.append((r * cos(angle), r * sin(angle), z))
    for band in range(len(profile) - 1):
        for j in range(SEGMENTS):
            a = band * stride + j
            b = (band + 1) * stride + j
            faces.append((a, a + 1, b + 1, b))

    def side_uv(index, _point):
        band, j = divmod(index, stride)
        return (j / SEGMENTS, (profile[band][1] + 0.40) / 0.645)

    add_mesh("Fluted pastry wall", vertices, faces, mat, side_uv)


def make_top(mat):
    vertices = [(0, 0, 0.245)]
    faces = []
    rings = 6
    for ring in range(1, rings + 1):
        for j in range(SEGMENTS):
            angle = j / SEGMENTS * 2 * pi
            r = ring / rings * (1.56 + scallop(angle))
            vertices.append((r * cos(angle), r * sin(angle), 0.245))
    for j in range(SEGMENTS):
        faces.append((0, 1 + j, 1 + (j + 1) % SEGMENTS))
    for ring in range(1, rings):
        inner = 1 + (ring - 1) * SEGMENTS
        outer = 1 + ring * SEGMENTS
        for j in range(SEGMENTS):
            j2 = (j + 1) % SEGMENTS
            faces.append((inner + j, outer + j, outer + j2, inner + j2))

    def top_uv(_index, point):
        # Sample the top oval in the original three-quarter image, excluding
        # its photographed vertical wall and transparent outer corners.
        return (627 / 1254 + point[0] * 500 / (1.615 * 1254),
                1 - (470 - point[1] * 360 / 1.615) / 1254)

    add_mesh("Ornate top face", vertices, faces, mat, top_uv)


def make_bottom(mat):
    vertices = [(0, 0, -0.40)]
    faces = []
    for j in range(SEGMENTS):
        angle = j / SEGMENTS * 2 * pi
        radius = 1.48 + scallop(angle)
        vertices.append((radius * cos(angle), radius * sin(angle), -0.40))
    for j in range(SEGMENTS):
        faces.append((0, 1 + (j + 1) % SEGMENTS, 1 + j))
    def bottom_uv(_index, point):
        return (0.5 + point[0] / 3.08, 0.5 + point[1] / 3.08)

    add_mesh("Baked underside", vertices, faces, mat, bottom_uv)


def main():
    if not TOP.is_file() or not SIDE.is_file() or not BOTTOM.is_file():
        raise FileNotFoundError("Mooncake textures must exist before building the GLB")
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    top_mat = material("Golden pastry relief", (0.75, 0.35, 0.09), TOP)
    side_mat = material("Toasted fluted sides", (0.64, 0.29, 0.07), SIDE)
    underside_mat = material("Baked underside", (0.58, 0.30, 0.10), BOTTOM, roughness=0.78)
    make_side(side_mat)
    make_top(top_mat)
    make_bottom(underside_mat)
    bpy.ops.object.select_all(action="SELECT")
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=str(OUTPUT), export_format="GLB", use_selection=True, export_apply=True)
    print(f"Exported {OUTPUT}")


main()
