context("google", () => {
    beforeEach(() => {
        cy.visit("https://google.co.uk/");
    });

    it("search for the ace centre website via google", () => {
        cy.contains("I agree").click();

        cy.get('input[name="q"]').type("Ace centre{enter}");
        //cy.get('#rso > :first-child > a')

        cy.get('#rso > :first-child a[href="https://acecentre.org.uk/"]').click();

        cy.url().should("include", "acecentre.org.uk"); // => true
    });
});