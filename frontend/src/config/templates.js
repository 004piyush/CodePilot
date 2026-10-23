export const BOILERPLATES = {
  java: {
    filename: "HelloWorld.java",
    language: "java",
    code: `public class HelloWorld {
    public static void main(String[] args) {
        System.out.println("Hello, CodePilot!");
    }
}
`,
  },
  python: {
    filename: "main.py",
    language: "python",
    code: `def main():
    print("Hello from Python Sandbox!")

if __name__ == "__main__":
    main()
`,
  },
  javascript: {
    filename: "index.js",
    language: "javascript",
    code: `function main() {
    console.log("Hello from Node.js runtime!");
}

main();
`,
  },
};

export function getFileInfo(filename) {
  const ext = filename.split(".").pop().toLowerCase();
  
  switch (ext) {
    case "java":
      return { language: "java", defaultCode: BOILERPLATES.java.code };
    case "py":
      return { language: "python", defaultCode: BOILERPLATES.python.code };
    case "js":
    case "jsx":
      return { language: "javascript", defaultCode: BOILERPLATES.javascript.code };
    case "json":
      return { language: "json", defaultCode: "{\n  \n}\n" };
    case "toml":
      return { language: "ini", defaultCode: "# Configuration file\n" };
    default:
      return { language: "plaintext", defaultCode: "" };
  }
}