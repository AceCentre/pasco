// TODO This could be clever and recursive
const generateTableOfContents = (headings) => {
  const topLevelList = document.createElement("ol");

  /* Loop over heading items */
  for (const headingItem of headings) {
    const headingElement = createListItem(headingItem);

    /* Loop over subheadings if there are any */
    if (headingItem.subHeadings) {
      const sublistElement = document.createElement("ul");

      for (const subheadingItem of headingItem.subHeadings) {
        const subheadingElement = createListItem(subheadingItem);
        sublistElement.append(subheadingElement);
      }

      headingElement.append(sublistElement);
    }

    topLevelList.append(headingElement);
  }

  return topLevelList;
};

const createListItem = (itemDetails) => {
  const listItem = document.createElement("li");
  const anchorElement = document.createElement("a");
  anchorElement.href = itemDetails.anchorHref;
  anchorElement.textContent = itemDetails.heading;
  listItem.append(anchorElement);
  return listItem;
};

export default generateTableOfContents;
