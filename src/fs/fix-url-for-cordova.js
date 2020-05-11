const fixUrlForCordova = (url) => {
  return (
    (/^[a-z]+:\/\//i.test(url) ? "" : "cdvfile://localhost/bundle/www/") + url
  );
};

export default fixUrlForCordova;
