export function testPlugin() {
	// All remark and rehype plugins return a separate function
	/**
	 * @param {import('mdast').Root} tree
	 * @param {import('vfile').VFile} file
	 */
	return (tree, file) => {
		// find all links in tree
		const links = [];
		// walk all children
		visitChildren(tree, file);

		file.data.astro.frontmatter.customProperty = "Generated property";
	};
}

function visitChildren(node, file) {
	if (node.children) {
		if (node.children.some((child) => child.type === "link")) {
			// change to html link
			const links = node.children.filter((child) => child.type === "link");
			for (const link of links) {
				try {
					const url = new URL(link.url);
					link.type = "html";
					link.value = `<a href="${link.url}">
					<img src="${url.protocol}//${url.hostname}/favicon.ico" alt="${link.children[0].value}" style="width: 1.2em; height: 1.2em; vertical-align:-0.3em; display: inline" />
				${link.children[0].value}</a>`;
				} catch (e) {
					console.log(e);
				}
			}
		}
		for (const child of node.children) {
			visitChildren(child, file);
		}
	}
}
