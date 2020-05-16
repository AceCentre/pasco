import generateTableOfContents from "./table-of-contents.js";
import { screen } from "@testing-library/dom";
import "@testing-library/jest-dom/extend-expect";

describe("generateTableOfContents", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  describe("given an empty list", () => {
    it("returns an empty ordered list", () => {
      const tableOfContents = generateTableOfContents([]);
      document.body.append(tableOfContents);

      const list = screen.getByRole("list");

      expect(list.tagName).toStrictEqual("OL");
      expect(list.childElementCount).toEqual(0);
    });
  });

  describe("given a list of heading items", () => {
    it("returns an ordered list with 3 items", () => {
      const tableOfContents = generateTableOfContents([
        { heading: "HEADING ONE", anchorHref: "#HEADING_ONE" },
        { heading: "HEADING TWO", anchorHref: "#HEADING_TWO" },
        { heading: "HEADING THREE", anchorHref: "#HEADING_THREE" },
      ]);
      document.body.append(tableOfContents);

      const list = screen.getByRole("list");

      expect(list.tagName).toStrictEqual("OL");
      expect(list.childElementCount).toEqual(3);
    });
  });
});
