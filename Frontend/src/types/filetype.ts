export type FileItem = {
  id: string;                // unique id
  name: string;              // file/folder name
  type: "file" | "folder";   // literal union for kind
  starred: boolean;          // whether it's starred
  size?: number;             // optional (KB, bytes, etc.)
  lastModified?: Date;       // optional
  mimeType: string;
};