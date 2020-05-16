import generateTableOfContents from "./table-of-contents.js";
import { screen } from "@testing-library/dom";
import "@testing-library/jest-dom/extend-expect";

describe("generateTableOfContents", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  describe("given no parameters", () => {
    it("returns an empty ordered list", () => {
      const tableOfContents = generateTableOfContents();
      document.body.append(tableOfContents);

      const list = screen.getByRole("list");

      expect(list.tagName).toStrictEqual("OL");
      expect(list.childElementCount).toEqual(0);
    });
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

    it("returns three links", () => {
      const tableOfContents = generateTableOfContents([
        { heading: "HEADING ONE", anchorHref: "#HEADING_ONE" },
        { heading: "HEADING TWO", anchorHref: "#HEADING_TWO" },
        { heading: "HEADING THREE", anchorHref: "#HEADING_THREE" },
      ]);
      document.body.append(tableOfContents);

      const links = screen.getAllByRole("link");

      expect(links).toHaveLength(3);
    });

    it("returns links in the correct order", () => {
      const tableOfContents = generateTableOfContents([
        { heading: "HEADING ONE", anchorHref: "#HEADING_ONE" },
        { heading: "HEADING TWO", anchorHref: "#HEADING_TWO" },
        { heading: "HEADING THREE", anchorHref: "#HEADING_THREE" },
      ]);
      document.body.append(tableOfContents);

      const links = screen.getAllByRole("link");

      expect(links[0]).toHaveTextContent("ONE");
      expect(links[1]).toHaveTextContent("TWO");
      expect(links[2]).toHaveTextContent("THREE");
    });

    it("returns links to the correct place", () => {
      const tableOfContents = generateTableOfContents([
        { heading: "HEADING ONE", anchorHref: "#HEADING_ONE" },
        { heading: "HEADING TWO", anchorHref: "#HEADING_TWO" },
        { heading: "HEADING THREE", anchorHref: "#HEADING_THREE" },
      ]);
      document.body.append(tableOfContents);

      const links = screen.getAllByRole("link");

      expect(links[0].href).toEqual(expect.stringContaining("#HEADING_ONE"));
      expect(links[1].href).toEqual(expect.stringContaining("#HEADING_TWO"));
      expect(links[2].href).toEqual(expect.stringContaining("#HEADING_THREE"));
    });
  });

  describe("given a list with subheadings", () => {
    it("returns an ordered list and unordered list", () => {
      const tableOfContents = generateTableOfContents([
        {
          heading: "HEADING ONE",
          anchorHref: "#HEADING_ONE",
          subHeadings: [
            { heading: "SUBHEADING TWO", anchorHref: "#SUBHEADING_TWO" },
            { heading: "SUBHEADING THREE", anchorHref: "#SUBHEADING_THREE" },
          ],
        },
      ]);
      document.body.append(tableOfContents);

      const lists = screen.getAllByRole("list");

      expect(lists[0].tagName).toStrictEqual("OL");
      expect(lists[1].tagName).toStrictEqual("UL");
    });

    it("returns a list with one item and another with two", () => {
      const tableOfContents = generateTableOfContents([
        {
          heading: "HEADING ONE",
          anchorHref: "#HEADING_ONE",
          subHeadings: [
            { heading: "SUBHEADING TWO", anchorHref: "#SUBHEADING_TWO" },
            { heading: "SUBHEADING THREE", anchorHref: "#SUBHEADING_THREE" },
          ],
        },
      ]);
      document.body.append(tableOfContents);

      const lists = screen.getAllByRole("list");

      expect(lists[0].childNodes).toHaveLength(1);
      expect(lists[1].tagName).toHaveLength(2);
    });

    it("returns links in the correct order", () => {
      const tableOfContents = generateTableOfContents([
        {
          heading: "HEADING ONE",
          anchorHref: "#HEADING_ONE",
          subHeadings: [
            { heading: "SUBHEADING TWO", anchorHref: "#SUBHEADING_TWO" },
            { heading: "SUBHEADING THREE", anchorHref: "#SUBHEADING_THREE" },
          ],
        },
      ]);
      document.body.append(tableOfContents);

      const links = screen.getAllByRole("link");

      expect(links[0]).toHaveTextContent("HEADING ONE");
      expect(links[1]).toHaveTextContent("SUBHEADING TWO");
      expect(links[2]).toHaveTextContent("SUBHEADING THREE");
    });

    it("returns links to the correct places", () => {
      const tableOfContents = generateTableOfContents([
        {
          heading: "HEADING ONE",
          anchorHref: "#HEADING_ONE",
          subHeadings: [
            { heading: "SUBHEADING TWO", anchorHref: "#SUBHEADING_TWO" },
            { heading: "SUBHEADING THREE", anchorHref: "#SUBHEADING_THREE" },
          ],
        },
      ]);
      document.body.append(tableOfContents);

      const links = screen.getAllByRole("link");

      expect(links[0].href).toStrictEqual(expect.stringContaining("ONE"));
      expect(links[1].href).toStrictEqual(expect.stringContaining("TWO"));
      expect(links[2].href).toStrictEqual(expect.stringContaining("THREE"));
    });
  });
});
