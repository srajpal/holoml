// The HoloML site's one script. Every block of code can be reached with
// the Tab key, so that the keyboard can scroll one that is wider than the
// page; this takes the blocks that fit, and so do not scroll, out of the
// Tab order (the specification has over a hundred), and puts a block back
// when the window narrows and it scrolls again. Without this script every
// block stays reachable.
(() => {
  const blocks = [...document.querySelectorAll('pre[tabindex]')];
  const fit = () => {
    for (const block of blocks) {
      if (block.scrollWidth > block.clientWidth) block.setAttribute('tabindex', '0');
      else block.removeAttribute('tabindex');
    }
  };
  fit();
  // Again once the fonts are in, and whenever the window changes.
  addEventListener('load', fit);
  addEventListener('resize', fit);
})();
