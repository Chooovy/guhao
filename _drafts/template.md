---
# Copy this file to _posts/YYYY-MM-DD-your-slug.md to publish it.
# Files in _drafts/ are NOT published on GitHub Pages.
title: "Post title"
date: 2026-12-01 10:00:00 +0800
description: "One sentence shown on the homepage and in the blog list."
tags: [kv-cache, notes]
math: true          # set true to enable $inline$ and $$display$$ LaTeX via KaTeX
---

Opening paragraph. The first paragraph is also used as the excerpt if `description` is empty.

## A section

Inline math $O(n^2)$, display math:

$$
\text{Attention}(Q,K,V) = \operatorname{softmax}\!\left(\frac{QK^\top}{\sqrt{d}}\right)V
$$

```python
def hello():
    print("code blocks are highlighted")
```

![An image]({{ '/assets/img/blog/your-image.png' | relative_url }})

<div class="callout">A highlighted callout box.</div>
