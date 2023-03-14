// `nodes` contain any nodes you add from the graph (dependencies)
// `root` is a reference to this program's root node
// `state` is an object that persists across program updates. Store data here.
import { nodes, root, state } from "membrane";

state.forms = state.forms ?? {};

// Generates random string using fromCharCode
function randomStr(length) {
  // TODO: not hard-code
  // return "abcde";
  return Array.from({ length }, () =>
    String.fromCharCode(Math.floor(Math.random() * 26) + 97)
  ).join("");
}

export const Root = {
  create({ args: { title, canResubmit } }) {
    const id = randomStr(10);
    let resolve: null | ((value: unknown) => void) = null;
    let reject: null | ((reason?: any) => void) = null;
    const result = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    state.forms[id] = {
      id,
      title,
      canResubmit,
      inputs: [],
      resolve,
      reject,
      result,
    };
    return root.form({ id });
  },
  form: ({ args: { id } }) => {
    return { id };
  },
  endpoint: ({ args: { path, method, query, body } }) => {
    const [, id] = path.split("/");
    if (method === "POST") {
      const form = state.forms[id];
      if (!form) {
        return { status: 404, body: "Not found" };
      }

      // Parse the URL-encoded body
      const inputs = new URLSearchParams(body);
      const result = {};
      for (const input of form.inputs) {
        result[input.key] = inputs.get(input.key);
      }
      form.result = result;
      return html(`<section>Thanks!</section>`);
    } else if (method === "GET") {
      const form = state.forms[id];
      if (!form) {
        return { status: 404, body: "Not found" };
      }
      if (form.inputs.length === 0) {
        return html(`<section>Empty form</section>`);
      }
      if (form.result && !form.canResubmit) {
        return html(`<section>Form already submitted</section>`);
      }
      return html(`
        <section>
          <h2>${form.title}</h2>
          <form method="post">
            <table>
            ${form.inputs.map((p) => rowFor(p)).join("")}
            </table>
            <div style="display: flex; flex-direction: row; justify-content: center; margin-top: 10px;">
              <input type="submit"/>
            </div>
          </form>
        </section>
    `);
    } else {
      return { status: 405, body: "Method not allowed" };
    }
  },
};

// Helper function to produce nicer HTML
function html(body: string) {
  return `
    <!DOCTYPE html>
    <head>
      <style>
      </style>
      <meta charset="utf-8" />
      <title>Form</title>
      <link rel="stylesheet" href="https://www.membrane.io/light.css"></script>
    </head>
    <body>
      <div style="position: absolute; inset: 0px; display: flex; flex-direction: row; justify-content: center; align-items: center;">
        <div style="display: flex; flex-direction: column; align-items: center; max-width: 800px;">
          ${body}
        </div>
      </div>
    </body>
  `;
}

export const Form = {
  url: async ({ obj, self }) => {
    return (await nodes.process.endpointUrl.$get()) + "/" + obj.id;
  },
  string({ self, args }) {
    const form = state.forms[self.$argsAt(root.form).id];
    form.inputs.push({ type: "string", ...args });
  },
  date({ self, args }) {
    const form = state.forms[self.$argsAt(root.form).id];
    form.inputs.push({ type: "date", ...args });
  },
  result: ({ obj }) => {
    return JSON.stringify(state.forms[obj.id].result);
  },
};

interface TextInput {
  type: "string";
  key: string;
  label: string;
  pattern: string;
  multiline: boolean;
  required: boolean;
}

interface DateInput {
  type: "date";
  key: string;
  label: string;
  min: string;
  max: string;
  required: boolean;
}

type Input = DateInput | TextInput;

interface U extends Ui {}

function rowFor(i: Input) {
  let tag: string = "[Not supported]";
  const required = i.required ? "required" : "";
  switch (i.type) {
    case "string": {
      if (i.multiline) {
        tag = `<textarea style="width:100%;" name="${i.key}" rows="10" ></textarea>`;
      } else {
        const pattern = i.pattern ? `pattern="${i.pattern}"` : "";
        tag = `<input type="text" name="${i.key}" ${pattern} ${required} />`;
      }
      break;
    }
    case "date": {
      const min = i.min ? `min="${i.min}"` : "";
      const max = i.max ? `min="${i.max}"` : "";
      tag = `<input type="date" name="${i.key}" ${min} ${max} ${required} />`;
      break;
    }
  }
  // Full row for textarea
  if (i.type === "string" && i.multiline) {
    return `<tr><td colspan="2">${labelFor(
      i
    )}</td></tr><tr><td colspan="2">${tag}</td></tr>`;
  }
  return `<tr><td>${labelFor(i)}</td><td>${tag}</td></tr>`;
}

function labelFor(input: Input) {
  return `<label for="${input.key}">${input.label ?? input.key}</label>`;
}

export const Ui = {
  html: () => {},
};
