const link = document.getElementById("install-link") as HTMLAnchorElement;

const source = await fetch("/bookmarklet.js").then((res) => res.text());
link.href = `javascript:${encodeURIComponent(source)}`;
