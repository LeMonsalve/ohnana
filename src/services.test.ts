import { test, expect } from "bun:test";
import { ohnana } from "./core";
import { defineService } from "./toolkit/define-service";
import { ServiceContainer } from "./service-container";

test("defineService returns ServiceFactory", () => {
  const testService = defineService({
    id: "test",
    create: () => ({ hello: () => "world" }),
  });

  const instance = testService();
  expect(instance.id).toBe("test");
  expect(instance.definition).toBeDefined();
});

test("ServiceContainer registers and retrieves services", async () => {
  const container = new ServiceContainer();
  
  const testService = defineService({
    id: "test",
    create: () => ({ value: 42 }),
  });

  container.register(testService());
  await container.initialize({});

  const service = container.get<{ value: number }>("test");
  expect(service.value).toBe(42);
});

test("ServiceContainer detects circular dependencies", () => {
  const container = new ServiceContainer();

  const serviceA = defineService({
    id: "a",
    dependencies: ["b"] as const,
    create: () => ({}),
  });

  const serviceB = defineService({
    id: "b",
    dependencies: ["a"] as const,
    create: () => ({}),
  });

  container.register(serviceA());
  container.register(serviceB());

  expect(() => {
    container.validateDependencies(new Set());
  }).toThrow("Circular dependency detected");
});

test("ServiceContainer throws on missing dependency", () => {
  const container = new ServiceContainer();

  const testService = defineService({
    id: "test",
    dependencies: ["missing"] as const,
    create: () => ({}),
  });

  container.register(testService());

  expect(() => {
    container.validateDependencies(new Set());
  }).toThrow('Service "test" requires "missing" but it\'s not registered');
});

test("Service can depend on plugin instance", async () => {
  const mockDb = { query: () => "result" };

  const app = ohnana({
    plugins: [
      {
        id: "db",
        _context: {} as { db: typeof mockDb },
        instance: mockDb,
        hooks: {},
      },
    ],
    services: [
      defineService({
        id: "users",
        dependencies: ["db"] as const,
        create: (deps: any) => ({
          findAll: () => deps.db.query(),
        }),
      })(),
    ],
  });

  const res = await app.request("/test");
  expect(res).toBeDefined();
});

test("Service can depend on another service", async () => {
  const container = new ServiceContainer();

  const emailService = defineService({
    id: "email",
    create: () => ({
      send: (to: string) => `Sent to ${to}`,
    }),
  });

  const userService = defineService({
    id: "users",
    dependencies: ["email"] as const,
    create: (deps: any) => ({
      create: (email: string) => deps.email.send(email),
    }),
  });

  container.register(emailService());
  container.register(userService());
  container.validateDependencies(new Set());
  await container.initialize({});

  const users = container.get<any>("users");
  expect(users.create("test@example.com")).toBe("Sent to test@example.com");
});

test("Service onInit is called during initialization", async () => {
  const container = new ServiceContainer();
  let initCalled = false;

  const testService = defineService({
    id: "test",
    onInit: async () => {
      initCalled = true;
    },
    create: () => ({}),
  });

  container.register(testService());
  await container.initialize({});

  expect(initCalled).toBe(true);
});

test("Service onShutdown is called in reverse order", async () => {
  const container = new ServiceContainer();
  const shutdownOrder: string[] = [];

  const serviceA = defineService({
    id: "a",
    create: () => ({}),
    onShutdown: async () => {
      shutdownOrder.push("a");
    },
  });

  const serviceB = defineService({
    id: "b",
    create: () => ({}),
    onShutdown: async () => {
      shutdownOrder.push("b");
    },
  });

  container.register(serviceA());
  container.register(serviceB());
  await container.initialize({});
  await container.shutdown();

  expect(shutdownOrder).toEqual(["b", "a"]);
});

test("c.service() returns typed service instance", async () => {
  const app = ohnana({
    plugins: [],
    services: [
      defineService({
        id: "test",
        create: () => ({
          getValue: () => 123,
        }),
      })(),
    ],
  });

  app.get("/test", (c) => {
    const service = (c as any).service("test");
    return c.json({ value: service.getValue() });
  });

  const res = await app.request("/test");
  const data = await res.json() as { value: number };
  expect(data.value).toBe(123);
});
