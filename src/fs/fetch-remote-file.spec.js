import mock from "xhr-mock";
import fetchRemoteFile from "./fetch-remote-file";

describe("fetch-remote-file", () => {
  beforeEach(() => mock.setup());
  afterEach(() => mock.teardown());

  it("If we don't specify a responseType it just returns the responseText", async () => {
    const MOCK_FILE_PATH = "/my-data";
    const EXPECTED_FILE_TEXT = "file text";

    mock.get(MOCK_FILE_PATH, (req, res) => {
      return res.status(200).body(EXPECTED_FILE_TEXT);
    });

    const remoteFile = await fetchRemoteFile(MOCK_FILE_PATH, { method: "GET" });

    expect(remoteFile).toStrictEqual(EXPECTED_FILE_TEXT);
  });
});
