"""Generates public/noise.jpg, a tileable film-grain texture for the page overlay."""
import site
import sys

sys.path.append(site.getusersitepackages())

import numpy as np
from PIL import Image

rng = np.random.default_rng(3)
n = rng.normal(91, 5.9, (640, 640)).clip(0, 255).astype(np.uint8)
Image.fromarray(n, "L").save(sys.argv[1], quality=85)
