context("Pasco", () => {
    beforeEach(() => {
        const baseUrl = Cypress.config().baseUrl
            cy.visit(baseUrl);
       });
       it("Loads Pasco Web App , selects skip btn , loads Quick set up page ", () => {
        cy.contains("Skip").click();
        cy.url().should("include", "quick-setup.html"); 
         });
      });