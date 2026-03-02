import { Inngest } from "inngest";

const globalForInngest = globalThis as unknown as {
  inngest: Inngest | undefined;
};

function createInngestClient() {
  return new Inngest({
    id: "regitrackr",
    name: "RegiTrackr",
  });
}

export const inngest = globalForInngest.inngest ?? createInngestClient();

if (process.env.NODE_ENV !== "production") {
  globalForInngest.inngest = inngest;
}
