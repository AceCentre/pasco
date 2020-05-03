const waitForEvent = (eventString) => {
  if (!eventString)
    throw new Error("You need to specify event string to wait for");

  return new Promise((res) => {
    document.addEventListener(
      eventString,
      () => {
        res();
      },
      { once: true }
    );
  });
};

export default waitForEvent;
