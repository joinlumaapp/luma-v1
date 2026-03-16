import { BadRequestException } from "@nestjs/common";
import { SanitizePipe } from "./sanitize.pipe";
import { ArgumentMetadata } from "@nestjs/common";

describe("SanitizePipe", () => {
  let pipe: SanitizePipe;

  const bodyMetadata: ArgumentMetadata = { type: "body" };
  const queryMetadata: ArgumentMetadata = { type: "query" };
  const customMetadata: ArgumentMetadata = { type: "custom" };

  beforeEach(() => {
    pipe = new SanitizePipe();
  });

  describe("basic behavior", () => {
    it("should pass through null and undefined", () => {
      expect(pipe.transform(null, bodyMetadata)).toBeNull();
      expect(pipe.transform(undefined, bodyMetadata)).toBeUndefined();
    });

    it("should pass through numbers and booleans", () => {
      expect(pipe.transform(42, bodyMetadata)).toBe(42);
      expect(pipe.transform(true, bodyMetadata)).toBe(true);
    });

    it("should skip non-body/query/param types", () => {
      const xssInput = '<script>alert("xss")</script>';
      expect(pipe.transform(xssInput, customMetadata)).toBe(xssInput);
    });
  });

  describe("string sanitization", () => {
    it("should trim whitespace", () => {
      expect(pipe.transform("  hello  ", bodyMetadata)).toBe("hello");
    });

    it("should strip HTML tags", () => {
      expect(pipe.transform("<b>bold</b> text", bodyMetadata)).toBe(
        "bold text",
      );
    });

    it("should strip script tags", () => {
      expect(
        pipe.transform('<script>alert("xss")</script>hello', bodyMetadata),
      ).toBe('alert("xss")hello');
    });

    it("should normalize multiple spaces", () => {
      expect(pipe.transform("hello    world", bodyMetadata)).toBe(
        "hello world",
      );
    });

    it("should reject javascript: protocol XSS", () => {
      expect(() => pipe.transform("javascript:alert(1)", bodyMetadata)).toThrow(
        BadRequestException,
      );
    });

    it("should reject event handler XSS", () => {
      expect(() => pipe.transform("onerror=alert(1)", bodyMetadata)).toThrow(
        BadRequestException,
      );
    });

    it("should reject vbscript: protocol", () => {
      expect(() =>
        pipe.transform('vbscript:MsgBox("xss")', bodyMetadata),
      ).toThrow(BadRequestException);
    });
  });

  describe("string length limits", () => {
    it("should reject strings exceeding max length", () => {
      const longString = "a".repeat(10_001);
      expect(() => pipe.transform(longString, bodyMetadata)).toThrow(
        BadRequestException,
      );
    });

    it("should allow strings within max length", () => {
      const okString = "a".repeat(10_000);
      expect(pipe.transform(okString, bodyMetadata)).toBe(okString);
    });
  });

  describe("object sanitization", () => {
    it("should sanitize all string fields in an object", () => {
      const input = {
        name: "  <b>John</b>  ",
        bio: '<script>alert("xss")</script>Hello',
        age: 25,
      };

      const result = pipe.transform(input, bodyMetadata) as Record<
        string,
        unknown
      >;
      expect(result["name"]).toBe("John");
      expect(result["bio"]).toBe('alert("xss")Hello');
      expect(result["age"]).toBe(25);
    });

    it("should recursively sanitize nested objects", () => {
      const input = {
        profile: {
          name: "  <em>Test</em>  ",
        },
      };

      const result = pipe.transform(input, bodyMetadata) as Record<
        string,
        Record<string, unknown>
      >;
      expect(result["profile"]["name"]).toBe("Test");
    });

    it("should sanitize arrays", () => {
      const input = ["<b>one</b>", "<i>two</i>"];
      const result = pipe.transform(input, bodyMetadata) as string[];
      expect(result).toEqual(["one", "two"]);
    });
  });

  describe("skip fields", () => {
    it("should not sanitize token fields", () => {
      const input = { refreshToken: "eyJ<html>token.value" };
      const result = pipe.transform(input, bodyMetadata) as Record<
        string,
        unknown
      >;
      expect(result["refreshToken"]).toBe("eyJ<html>token.value");
    });

    it("should not sanitize base64 image fields", () => {
      const input = { selfieBase64: "data:image/png;base64,<content>" };
      const result = pipe.transform(input, bodyMetadata) as Record<
        string,
        unknown
      >;
      expect(result["selfieBase64"]).toBe("data:image/png;base64,<content>");
    });
  });

  describe("query parameters", () => {
    it("should sanitize query params", () => {
      expect(pipe.transform("<b>search</b>", queryMetadata)).toBe("search");
    });
  });
});
