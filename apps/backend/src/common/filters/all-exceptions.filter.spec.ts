import {
  HttpException,
  HttpStatus,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
} from "@nestjs/common";
import { AllExceptionsFilter } from "./all-exceptions.filter";

// Mock Sentry
jest.mock("@sentry/nestjs", () => ({
  withScope: jest.fn((cb: (scope: Record<string, unknown>) => void) => {
    cb({
      setUser: jest.fn(),
      setTag: jest.fn(),
      setExtra: jest.fn(),
    });
  }),
  captureException: jest.fn(),
}));

describe("AllExceptionsFilter", () => {
  let filter: AllExceptionsFilter;
  let mockResponse: {
    status: jest.Mock;
    json: jest.Mock;
    headersSent: boolean;
  };
  let mockRequest: {
    method: string;
    url: string;
    ip: string;
    get: jest.Mock;
  };
  let mockHost: {
    getType: jest.Mock;
    switchToHttp: jest.Mock;
  };

  beforeEach(() => {
    // Reset NODE_ENV for each test
    process.env.NODE_ENV = "test";

    filter = new AllExceptionsFilter();

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      headersSent: false,
    };

    mockRequest = {
      method: "GET",
      url: "/api/v1/test",
      ip: "127.0.0.1",
      get: jest.fn().mockReturnValue("test-agent"),
    };

    mockHost = {
      getType: jest.fn().mockReturnValue("http"),
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    };
  });

  it("should handle HttpException with correct status", () => {
    const exception = new BadRequestException("Invalid input");

    filter.catch(exception, mockHost as never);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        path: "/api/v1/test",
      }),
    );
  });

  it("should handle UnauthorizedException", () => {
    const exception = new UnauthorizedException("Token expired");

    filter.catch(exception, mockHost as never);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
  });

  it("should handle NotFoundException", () => {
    const exception = new NotFoundException("User not found");

    filter.catch(exception, mockHost as never);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
  });

  it("should handle generic Error as 500", () => {
    const exception = new Error("Database connection failed");

    filter.catch(exception, mockHost as never);

    expect(mockResponse.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: "Sunucu hatasi olustu",
      }),
    );
  });

  it("should handle non-Error exceptions as 500", () => {
    filter.catch("unexpected string error", mockHost as never);

    expect(mockResponse.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Bilinmeyen bir hata olustu",
      }),
    );
  });

  it("should handle validation pipe array messages", () => {
    const exception = new HttpException(
      {
        statusCode: 400,
        message: ["field1 is required", "field2 must be string"],
        error: "Bad Request",
      },
      HttpStatus.BAD_REQUEST,
    );

    filter.catch(exception, mockHost as never);

    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "field1 is required, field2 must be string",
      }),
    );
  });

  it("should not send response if headers already sent", () => {
    mockResponse.headersSent = true;
    const exception = new Error("test");

    filter.catch(exception, mockHost as never);

    expect(mockResponse.status).not.toHaveBeenCalled();
  });

  it("should handle WebSocket context type", () => {
    mockHost.getType.mockReturnValue("ws");
    const exception = new Error("ws error");

    // Should not throw
    expect(() => filter.catch(exception, mockHost as never)).not.toThrow();
  });

  it("should include debug info in non-production", () => {
    process.env.NODE_ENV = "development";
    const newFilter = new AllExceptionsFilter();
    const exception = new Error("debug test");

    newFilter.catch(exception, mockHost as never);

    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        debug: expect.objectContaining({
          name: "Error",
        }),
      }),
    );
  });

  it("should mask messages containing sensitive info", () => {
    const exception = new HttpException(
      "SQL query failed: SELECT * FROM users",
      HttpStatus.INTERNAL_SERVER_ERROR,
    );

    filter.catch(exception, mockHost as never);

    const jsonCall = mockResponse.json.mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect(jsonCall["message"]).not.toContain("SELECT");
  });

  it("should include timestamp in response", () => {
    filter.catch(new BadRequestException("test"), mockHost as never);

    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        timestamp: expect.any(String),
      }),
    );
  });
});
