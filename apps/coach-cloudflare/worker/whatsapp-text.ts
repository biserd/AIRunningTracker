// Keep the chat readable even if the model copies old Markdown/source blocks.
// Action links in ordinary account/help replies are left intact.
export function whatsappText(text: string, researched = false, max = 1400) {
  let body = text.replace(/\uE200[^\uE201]*\uE201/g, '').replace(/\u2014/g, ', ')
    .replace(/(?:^|\n)\s*(?:\*{0,2})?(?:sources?|references?|citations?)\s*[:：][\s\S]*$/i, '');
  if (researched) {
    body = body.replace(/\[([^\]]+)\]\(https?:\/\/[^\s)]+\)/g, '$1')
      .replace(/https?:\/\/[^\s<>]+/g, '')
      .replace(/\[\d+(?:\s*,\s*\d+)*\]/g, '');
  }
  body = body.replace(/\*|`/g, '').replace(/(^|\s)_{1,2}([^_\n]+)_{1,2}(?=\s|[.,!?]|$)/g, '$1$2')
    .replace(/^\s*#{1,6}\s+/gm, '').replace(/[ \t]+([.,!?])/g, '$1')
    .replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  return body.length > max ? body.slice(0, max - 1).trimEnd() + '…' : body;
}
