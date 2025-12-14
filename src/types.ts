export interface Commit {
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  date: string;
}

export interface ProgramOptions {
  number: string;
  all?: boolean;
  squash?: boolean;
  reword?: boolean;
}
