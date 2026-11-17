---
title: "Why my avatar is quantized"
date: 2026-11-16 16:00:00 +0800
description: "A tiny, interactive excuse to explain uniform quantization — and the first post on this blog."
tags: [quantization, meta]
math: true
---

If you landed on the homepage, you probably noticed that my avatar does not arrive in one piece. It loads at **1 bit**, then climbs through INT2, INT4 and INT8 before settling at full precision. You can push it back down with the little switch underneath.

It is a toy, but it is also an honest summary of what I work on: deciding how many bits a model *really* needs.

## Uniform quantization in one line

Given a value $x$ in $[0, 255]$ and a budget of $b$ bits, uniform quantization snaps it to one of $2^b$ evenly spaced levels:

$$
Q_b(x) = \Delta \cdot \operatorname{round}\!\left(\frac{x}{\Delta}\right),
\qquad \Delta = \frac{255}{2^b - 1}.
$$

For LLM weights the idea is the same, except that the range is set per channel or per group, and the interesting part is everything around this line: outliers, rotations, codebooks, and keeping training stable when rollouts run in low precision.

## The numbers behind the switch

The avatar is a $460 \times 460$ RGB image. Here is what each setting costs:

| Format | Bits / channel | Size | vs. FP16 |
|:--|--:|--:|--:|
| FP16 | 16 | 1.27 MB | 1.0× |
| INT8 | 8 | 635 KB | 2.0× |
| INT4 | 4 | 317 KB | 4.0× |
| INT2 | 2 | 159 KB | 8.0× |
| 1-bit | 1 (grayscale) | 26 KB | 48.0× |

INT8 is visually lossless. INT4 starts to band in the sky. INT2 looks like a 1990s GIF. 1-bit only survives because of error diffusion — the same lesson that makes [sub-1-bit LLMs](https://arxiv.org/abs/2506.12040) possible: *where* you put the error matters as much as how much of it there is.

## The code

The core of the demo is a few lines of plain JavaScript:

```js
const L = (1 << bits) - 1, step = 255 / L;
for (let i = 0; i < pixels.length; i += 4) {
  for (let c = 0; c < 3; c++) {
    const q = Math.round(pixels[i + c] / step + ditherBias(i));
    out[i + c] = Math.min(L, Math.max(0, q)) * step;
  }
}
```

> Compression is not about throwing information away. It is about deciding, carefully, which information was never needed.

## What comes next

I plan to write here about the papers behind this site — sparse attention, KV-cache eviction, MoE compression and low-bit training — in a less formal voice than the papers themselves, plus the occasional note on tools and experiments that did not make it into a PDF.

Subscribe via [RSS]({{ '/feed.xml' | relative_url }}) if you'd like to follow along.
