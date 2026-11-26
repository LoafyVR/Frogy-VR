# GorillaLocomotion movement reference and attribution

Reference: https://github.com/Another-Axiom/GorillaLocomotion
Author: Another Axiom (2021). Source language: C# / Unity.
License: MIT. The MIT copyright notice and full license are reproduced below.

Frogy's v17 experimental `public/movement.js` is a JavaScript adaptation of the
open-source locomotion **design principles**, not a drop-in copy of Unity code:
tracked/reach-limited palms, swept hand-sphere world contact, displacement of
a planted hand, combined two-handed motion, release on unstick, and persistent
momentum with capped speeds. Frogy uses its own WebXR controller coordinates,
analytic world geometry and single-client integrator; Unity's Physics system
and Rigidbody are not available in the browser.

## MIT License

Copyright (c) 2021 Another-Axiom

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
