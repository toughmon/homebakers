import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { createRecipeMcpServer } from "./server.js";

void serveStdio(() => createRecipeMcpServer());
