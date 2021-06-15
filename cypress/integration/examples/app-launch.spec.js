context("Pasco", () => {
    beforeEach(() => {
            cy.visit("https://app.pasco.chat/intro.html");
       });
       it("Loads Pasco Web App , selects skip btn , loads Quick set up page ", () => {
        cy.contains("Skip").click();
        cy.url().should("include", "app.pasco.chat/quick-setup.html"); 
         });
      });