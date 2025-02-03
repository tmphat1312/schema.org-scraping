export const getHTML = async ({ url }: { url: string }) =>
  fetch(url).then((res) => res.text());
