import { describe, test, expect } from "bun:test";
import { ohnana } from "../index";
import { defineService } from "../toolkit/define-service";

describe("Service Type Safety", () => {
  describe("c.service() is typed", () => {
    test("service access returns typed service without cast", () => {
      interface UserService {
        getUser: (id: string) => { id: string; name: string };
        createUser: (name: string) => { id: string; name: string };
      }

      const userService = defineService({
        id: "users",
        create: (): UserService => ({
          getUser: (id) => ({ id, name: `User ${id}` }),
          createUser: (name) => ({ id: "123", name }),
        }),
      });

      const app = ohnana({
        plugins: [],
        services: [userService()] as const,
      });

      app.get("/users/:id", (c) => {
        const users = c.get("service")("users");
        const user = users.getUser(c.req.param("id"));

        return c.json({ user });
      });

      expect(app).toBeDefined();
    });

    test("service accessor is available in context", () => {
      const userService = defineService({
        id: "users",
        create: () => ({
          getUser: (id: string) => ({ id, name: `User ${id}` }),
        }),
      });

      const app = ohnana({
        plugins: [],
        services: [userService()] as const,
      });

      app.get("/test", (c) => {
        const service = c.get("service");
        expect(typeof service).toBe("function");

        return c.json({ ok: true });
      });

      expect(app).toBeDefined();
    });

    test("service method calls are typed", () => {
      interface UserService {
        getUser: (id: string) => { id: string; name: string };
        listUsers: () => Array<{ id: string; name: string }>;
      }

      const userService = defineService({
        id: "users",
        create: (): UserService => ({
          getUser: (id) => ({ id, name: `User ${id}` }),
          listUsers: () => [
            { id: "1", name: "Alice" },
            { id: "2", name: "Bob" },
          ],
        }),
      });

      const app = ohnana({
        plugins: [],
        services: [userService()] as const,
      });

      app.get("/users", (c) => {
        const users = c.get("service")("users");
        const userList: Array<{ id: string; name: string }> = users.listUsers();

        return c.json({ users: userList });
      });

      expect(app).toBeDefined();
    });

    test("multiple services are all typed", () => {
      const userService = defineService({
        id: "users",
        create: () => ({
          getUser: (id: string) => ({ id, name: `User ${id}` }),
        }),
      });

      const postService = defineService({
        id: "posts",
        create: () => ({
          getPost: (id: string) => ({ id, title: `Post ${id}` }),
        }),
      });

      const app = ohnana({
        plugins: [],
        services: [userService(), postService()] as const,
      });

      app.get("/data", (c) => {
        const users = c.get("service")("users");
        const posts = c.get("service")("posts");

        const user = users.getUser("1");
        const post = posts.getPost("1");

        return c.json({ user, post });
      });

      expect(app).toBeDefined();
    });
  });
});
