import os
import math
import subprocess

cos30 = math.cos(math.radians(30))
sin30 = math.sin(math.radians(30))
cx, cy = 128.0, 128.0

# 1. Geometry Coordinates Calculation
R = 94.0  # Outer Hexagon radius
r = 74.0  # Inner Hexagon radius

p_out = [
    (cx, cy - R),
    (cx + R * cos30, cy - R * sin30),
    (cx + R * cos30, cy + R * sin30),
    (cx, cy + R),
    (cx - R * cos30, cy + R * sin30),
    (cx - R * cos30, cy - R * sin30)
]

p_in = [
    (cx, cy - r),
    (cx - r * cos30, cy - r * sin30),
    (cx - r * cos30, cy + r * sin30),
    (cx, cy + r),
    (cx + r * cos30, cy + r * sin30),
    (cx + r * cos30, cy - r * sin30)
]

d_hex = f'M {p_out[0][0]:.3f},{p_out[0][1]:.3f} ' + ' '.join([f'L {x:.3f},{y:.3f}' for x, y in p_out[1:]]) + ' Z '
d_hex += f'M {p_in[0][0]:.3f},{p_in[0][1]:.3f} ' + ' '.join([f'L {x:.3f},{y:.3f}' for x, y in p_in[1:]]) + ' Z'

# 2. Central Voxel Facets
# Core radius = 48
# Facets separated by 6px conduits meeting at central diamond
# Top Facet:
# Top apex: (128, 88)
# Right apex: (128 + 36*cos30, 88 + 36*sin30) = (159.177, 106.000)
# Center right: (132.500, 122.500)
# Center notch: (128.000, 120.000)
# Center left: (123.500, 122.500)
# Left apex: (128 - 36*cos30, 88 + 36*sin30) = (96.823, 106.000)
top_facet_pts = [
    (128.000, 88.000),
    (159.177, 106.000),
    (132.500, 121.400),
    (128.000, 118.800),
    (123.500, 121.400),
    (96.823, 106.000)
]

# Left Facet:
# Top-left apex: (93.359, 112.000)
# Inner notch: (123.500, 129.400)
# Bottom notch: (123.500, 160.000)
# Bottom apex: (93.359, 142.679)
left_facet_pts = [
    (93.359, 112.000),
    (123.500, 129.400),
    (123.500, 162.000),
    (93.359, 144.596)
]

# Right Facet:
# Top-right apex: (162.641, 112.000)
# Bottom apex: (162.641, 144.596)
# Bottom notch: (132.500, 162.000)
# Inner notch: (132.500, 129.400)
right_facet_pts = [
    (162.641, 112.000),
    (162.641, 144.596),
    (132.500, 162.000),
    (132.500, 129.400)
]

# Central Singularity Core Node (Isometric Voxel Diamond):
node_pts = [
    (128.000, 123.000),
    (131.464, 125.000),
    (131.464, 131.000),
    (128.000, 133.000),
    (124.536, 131.000),
    (124.536, 125.000)
]

def pts_str(pts):
    return ' '.join([f'{x:.3f},{y:.3f}' for x, y in pts])

# A. Generate Mono Symbol (Master)
svg_mono = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <title>Singularity - Hexacore Master Insignia (Monochrome)</title>
  <!-- Outer Perimeter Shield -->
  <path d="{d_hex}" fill-rule="evenodd" fill="#090d16" />
  <!-- Central Voxel - Top Facet -->
  <polygon points="{pts_str(top_facet_pts)}" fill="#090d16" />
  <!-- Central Voxel - Left Facet -->
  <polygon points="{pts_str(left_facet_pts)}" fill="#090d16" />
  <!-- Central Voxel - Right Facet -->
  <polygon points="{pts_str(right_facet_pts)}" fill="#090d16" />
  <!-- Central Singularity Node -->
  <polygon points="{pts_str(node_pts)}" fill="#090d16" />
</svg>'''

with open('branding/master-symbol-mono.svg', 'w', encoding='utf-8') as f:
    f.write(svg_mono)

# B. Generate Color Symbol (Hero Brand Version - Disciplined 3-Colour Palette)
svg_color = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <title>Singularity - Hexacore Master Insignia (Hero Color)</title>
  <!-- Outer Perimeter Shield -->
  <path d="{d_hex}" fill-rule="evenodd" fill="#06b6d4" />
  <!-- Central Voxel - Top Facet (Cyan Luminous Sky) -->
  <polygon points="{pts_str(top_facet_pts)}" fill="#38bdf8" />
  <!-- Central Voxel - Left Facet (Deep Cosmic Void) -->
  <polygon points="{pts_str(left_facet_pts)}" fill="#0284c7" />
  <!-- Central Voxel - Right Facet (NebulaX Emerald Pulse) -->
  <polygon points="{pts_str(right_facet_pts)}" fill="#10b981" />
  <!-- Central Singularity Quantum Node -->
  <polygon points="{pts_str(node_pts)}" fill="#38bdf8" />
</svg>'''

with open('branding/master-symbol-color.svg', 'w', encoding='utf-8') as f:
    f.write(svg_color)

# C. Generate Small-Size Optical Cut (Optimized for 16px/32px Favicon - Real Hole)
r_sm = 68.0
p_in_sm = [
    (cx, cy - r_sm),
    (cx - r_sm * cos30, cy - r_sm * sin30),
    (cx - r_sm * cos30, cy + r_sm * sin30),
    (cx, cy + r_sm),
    (cx + r_sm * cos30, cy + r_sm * sin30),
    (cx + r_sm * cos30, cy - r_sm * sin30)
]
d_hex_sm = f'M {p_out[0][0]:.3f},{p_out[0][1]:.3f} ' + ' '.join([f'L {x:.3f},{y:.3f}' for x, y in p_out[1:]]) + ' Z '
d_hex_sm += f'M {p_in_sm[0][0]:.3f},{p_in_sm[0][1]:.3f} ' + ' '.join([f'L {x:.3f},{y:.3f}' for x, y in p_in_sm[1:]]) + ' Z'

top_sm = [
    (128.000, 92.000),
    (155.000, 107.588),
    (134.000, 119.713),
    (128.000, 116.248),
    (122.000, 119.713),
    (101.000, 107.588)
]
left_sm = [
    (96.000, 116.248),
    (122.000, 131.259),
    (122.000, 158.000),
    (96.000, 142.989)
]
right_sm = [
    (160.000, 116.248),
    (160.000, 142.989),
    (134.000, 158.000),
    (134.000, 131.259)
]

# Small node with real hole
svg_small = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <title>Singularity - Small Size Favicon Cut</title>
  <path d="{d_hex_sm}" fill-rule="evenodd" fill="#06b6d4" />
  <polygon points="{pts_str(top_sm)}" fill="#06b6d4" />
  <polygon points="{pts_str(left_sm)}" fill="#0284c7" />
  <polygon points="{pts_str(right_sm)}" fill="#10b981" />
  <polygon points="{pts_str(node_pts)}" fill="#06b6d4" />
</svg>'''

with open('branding/master-symbol-small.svg', 'w', encoding='utf-8') as f:
    f.write(svg_small)

print("Generated master-symbol-mono.svg, master-symbol-color.svg, master-symbol-small.svg")
