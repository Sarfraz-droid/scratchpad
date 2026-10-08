import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { env } from "./lib/env";
import { healthRoutes } from "./routes/health";
import { projectRoutes } from "./routes/projects";
import { chatRoutes } from "./routes/chat";
import { canvasRoutes } from "./routes/canvas";
import { fileRoutes } from "./routes/files";
import { noteRoutes } from "./routes/notes";

const app = new Elysia()
  .use(cors({ origin: env.corsOrigin.split(",") }))
  .use(
    swagger({
      // @elysiajs/swagger ships Scalar's API reference UI by default.
      path: "/docs",
      documentation: {
        info: {
          title: "Scratchpad API",
          version: "0.0.0",
          description: "Backend for the Scratchpad canvas + chat workspace.",
        },
      },
    }),
  )
  .use(healthRoutes)
  .use(projectRoutes)
  .use(chatRoutes)
  .use(canvasRoutes)
  .use(fileRoutes)
  .use(noteRoutes)
  .listen(env.port);

console.log(`Scratchpad server running at http://localhost:${env.port}`);
console.log(`API docs (Scalar) at http://localhost:${env.port}/docs`);

export type App = typeof app;
