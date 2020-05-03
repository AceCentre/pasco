import showOrHideGoToTopLink from "./show-or-hide-go-top-link";

describe("showOrHideGoToTopLink", () => {
  it("Throws an error if it cant find the go to top link", () => {
    document.body.innerHTML = `
        <div>
        </div>
    `;

    expect(showOrHideGoToTopLink).toThrow('Couldnt find "#move-top-link"');
  });

  it("Adds hidden class if scroll position is under 500", () => {
    document.body.innerHTML = `
        <div>
            <a id="move-top-link">Go to top link</a>
        </div>
    `;
    window.scrollY = 1;

    showOrHideGoToTopLink();

    expect(document.body.innerHTML).toEqual(`
        <div>
            <a id="move-top-link" class="hidden">Go to top link</a>
        </div>
    `);
  });

  it("Removes hidden class if scroll position is under 500", () => {
    document.body.innerHTML = `
        <div>
            <a id="move-top-link" class="hidden">Go to top link</a>
        </div>
    `;
    window.scrollY = 501;

    showOrHideGoToTopLink();

    expect(document.body.innerHTML).toEqual(`
        <div>
            <a id="move-top-link" class="">Go to top link</a>
        </div>
    `);
  });

  it("Removes hidden class if scroll position isnt defined", () => {
    document.body.innerHTML = `
        <div>
            <a id="move-top-link" class="hidden">Go to top link</a>
        </div>
    `;
    window = {};

    showOrHideGoToTopLink();

    expect(document.body.innerHTML).toEqual(`
        <div>
            <a id="move-top-link" class="">Go to top link</a>
        </div>
    `);
  });
});
