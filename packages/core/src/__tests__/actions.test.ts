import { expect, test } from "vitest";
import { classifyAction } from "../actions.js";

test("GET → read", () => {
  expect(classifyAction("get", "/users")).toBe("read");
});
test("DELETE → delete", () => {
  expect(classifyAction("delete", "/users/{id}")).toBe("delete");
});
test("PUT/PATCH → update", () => {
  expect(classifyAction("put", "/users/{id}")).toBe("update");
  expect(classifyAction("patch", "/users/{id}")).toBe("update");
});
test("POST default → write", () => {
  expect(classifyAction("post", "/users")).toBe("write");
});
test("keyword override: payment", () => {
  expect(classifyAction("post", "/checkout/charge")).toBe("payment");
});
test("keyword override: send_message", () => {
  expect(classifyAction("post", "/messages/send")).toBe("send_message");
});
test("keyword override: upload", () => {
  expect(classifyAction("post", "/files/upload")).toBe("upload");
});
test("keyword override: auth_token", () => {
  expect(classifyAction("post", "/oauth/token")).toBe("auth_token");
});
test("keyword override: admin_role", () => {
  expect(classifyAction("post", "/admin/roles")).toBe("admin_role");
});
test("unknown method → unknown", () => {
  expect(classifyAction("trace", "/x")).toBe("unknown");
});
