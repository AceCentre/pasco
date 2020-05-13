import generateTableOfContents from "./table-of-contents.js";
import { screen } from "@testing-library/dom";
import "@testing-library/jest-dom/extend-expect";

describe("generateTableOfContents", () => {
  describe("given an empty list", () => {
    it("returns an empty ordered list", () => {
      const tableOfContents = generateTableOfContents([]);
      document.body.append(tableOfContents);

      const list = screen.getByRole("list");

      expect(list.tagName).toStrictEqual("OL");
      expect(list.childElementCount).toEqual(0);
    });
  });

  //   describe("given a list of heading items", () => {
  //     it("returns an ordered list with links", () => {
  //       // const
  //     });
  //   });
});
