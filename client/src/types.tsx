export type Role = "Annotator" | "Admin";

export type User = { id: number; email: string; role: Role };

export type ImageItem = {
  id: number;
  filename: string;
  width: number;
  height: number;
  state: string;
  url: string;
};

export type AdminImage = ImageItem;

export type Label = {
  id: number;
  xmin: number;
  ymin: number;
  xmax: number;
  ymax: number;
  created_by: number;
};

export type Box = { xmin: number; ymin: number; xmax: number; ymax: number };