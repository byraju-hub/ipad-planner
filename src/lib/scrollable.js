// 목록 스크롤. 펜슬로 쓸 때 브라우저가 스크롤로 가로채지 않도록, 넘칠 때만 손가락 스크롤을 허용한다.
export function scrollable(node) {
  const update = () => {
    node.style.touchAction = node.scrollHeight > node.clientHeight + 1 ? 'pan-y' : 'none';
  };
  const ro = new ResizeObserver(update);
  ro.observe(node);
  const mo = new MutationObserver(update);
  mo.observe(node, { childList: true, subtree: true, characterData: true });
  update();
  return {
    destroy() {
      ro.disconnect();
      mo.disconnect();
    },
  };
}
