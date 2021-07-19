//test 2 quick setup amend slider 
//Open quick setup


describe("Select" , () => {
   it("should select an option from the select dropdown" , () => {
      cy.visit("https://app.pasco.chat/quick-setup.html");
      cy.get('#_cue_voice_id')
         .select("Microsoft George - English (United Kingdom)")
         .should('have.value', 'Microsoft George - English (United Kingdom)')
         
      //now press submit button (so it enters that altered cue voice in  quick set up )
      cy.get('button').contains("Start").click();

      //loads next page  
      cy.url().should("include", "app.pasco.chat/index.html"); 

      // now click setting icon
      // click ‘speech’

      cy.get("#edit-config-btn").click();

      cy.wait(1000);
      cy.get("a").contains("Speech").click();
      cy.url().should("include","app.pasco.chat/edit-config.html#!speech");
      
      cy.get("#_cue_voice_id").invoke("val").should("include","Microsoft George");   //check drop down value is george
   });
});



// function myFunction(myFirstVariable, mySecondVariable) {
//    return myFirstVariable + mySecondVariable;
// }

// let result = myFunction(2, 5)

// const myFunctionAnotherOne = (myVariable) => {
//    return myVariable + 1;
// }

// result = myFunctionAnotherOne(5)

// const myFunctionThatTakesAFunction = (param) => {
//    return param()
// }

// const myTempFunction = () => {
//    return 2
// }

// let result = myFunctionThatTakesAFunction(myTempFunction)








// const myFunctionThatTakesAFunction = (param) => {
//    return param()
// }

// let result = myFunctionThatTakesAFunction(() => {
//    return 2
// })









// const differentName = 1;
// let yetAnotherName = 2;

// differentName = 2;
// yetAnotherName = 3;

// var evenMoreWays = 3; // Don't use this one


    //[input#auditory_main_voice_options.volume.form-control.btn-lg,