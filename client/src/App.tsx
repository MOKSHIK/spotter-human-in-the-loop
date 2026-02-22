import { useEffect, useRef, useState } from "react";
import { api, setAuthToken } from "./api";
import { AuthPanel } from "./components/AuthPanel";
import { AdminDashboard } from "./components/AdminDashboard";
import type { AdminImage, Box, ImageItem, Label, User } from "./types";

export default function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState<User | null>(null);

  const [image, setImage] = useState<ImageItem | null>(null);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [msg, setMsg] = useState("");

  const [adminStateFilter, setAdminStateFilter] = useState<"Annotated" | "Verified" | "Rejected">("Annotated");
  const [adminImages, setAdminImages] = useState<AdminImage[]>([]);
  const [selectedAdminImage, setSelectedAdminImage] = useState<AdminImage | null>(null);
  const [adminLabels, setAdminLabels] = useState<Label[]>([]);

  // drawing refs/state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const adminImgRef = useRef<HTMLImageElement | null>(null);
  const adminCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [start, setStart] = useState<{ x: number; y: number } | null>(null);
  const [current, setCurrent] = useState<Box | null>(null);

  async function login() {
    setMsg("");
    const res = await api.post("/login", { email, password });
    setUser(res.data.user);
    setAuthToken(res.data.token);

    // reset per-role UI
    setImage(null);
    setBoxes([]);
    setCurrent(null);
    setAdminImages([]);
    setSelectedAdminImage(null);
    setAdminLabels([]);
  }

  function logout() {
    setUser(null);
    setAuthToken(null);
    setEmail("");
    setPassword("");
    setImage(null);
    setBoxes([]);
    setCurrent(null);
    setMsg("");
    setAdminImages([]);
    setSelectedAdminImage(null);
    setAdminLabels([]);
  }

  async function loadNext() {
    setMsg("");
    setBoxes([]);
    setCurrent(null);
    const res = await api.get("/images/next");
    setImage(res.data);
    console.log("Cameeee eheererrererererererererer")
  }

  async function loadAdminImages() {
    const res = await api.get("/admin/images", { params: { state: adminStateFilter } });
    setAdminImages(res.data.images);
    setSelectedAdminImage(null);
    setAdminLabels([]);
  }

  async function selectAdminImage(img: AdminImage) {
    setSelectedAdminImage(img);
    const res = await api.get(`/images/${img.id}/labels`);
    setAdminLabels(res.data.labels);
  }

  async function deleteLabel(labelId: number) {
    await api.delete(`/admin/labels/${labelId}`);
    if (selectedAdminImage) {
      const res = await api.get(`/images/${selectedAdminImage.id}/labels`);
      setAdminLabels(res.data.labels);
    }
  }

  async function setImageState(state: "Verified" | "Rejected") {
    if (!selectedAdminImage) return;
    await api.patch(`/admin/images/${selectedAdminImage.id}/state`, { state });
    await loadAdminImages();
  }

  // redraw annotator canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !image) return;

    canvas.width = img.clientWidth;
    canvas.height = img.clientHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.lineWidth = 2;
    ctx.strokeStyle = "red";
    for (const b of boxes) {
      ctx.strokeRect(b.xmin, b.ymin, b.xmax - b.xmin, b.ymax - b.ymin);
    }

    if (current) {
      ctx.strokeStyle = "lime";
      ctx.strokeRect(current.xmin, current.ymin, current.xmax - current.xmin, current.ymax - current.ymin);
    }
  }, [boxes, current, image]);

  // redraw admin overlay
  useEffect(() => {
    const img = adminImgRef.current;
    const canvas = adminCanvasRef.current;
    if (!img || !canvas || !selectedAdminImage) return;

    canvas.width = img.clientWidth;
    canvas.height = img.clientHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const scaleX = img.clientWidth / selectedAdminImage.width;
    const scaleY = img.clientHeight / selectedAdminImage.height;

    ctx.lineWidth = 2;
    ctx.strokeStyle = "orange";

    for (const l of adminLabels) {
      const x = l.xmin * scaleX;
      const y = l.ymin * scaleY;
      const w = (l.xmax - l.xmin) * scaleX;
      const h = (l.ymax - l.ymin) * scaleY;

      ctx.strokeRect(x, y, w, h);

      ctx.font = "12px sans-serif";
      ctx.fillStyle = "orange";
      ctx.fillText(`#${l.id}`, x + 4, y + 14);
    }
  }, [selectedAdminImage, adminLabels]);

  function getMousePos(e: React.MouseEvent<HTMLCanvasElement, MouseEvent>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function onMouseDown(e: React.MouseEvent<HTMLCanvasElement, MouseEvent>) {
    if (!image) return;
    setIsDrawing(true);
    const p = getMousePos(e);
    setStart(p);
    setCurrent({ xmin: p.x, ymin: p.y, xmax: p.x, ymax: p.y });
  }

  function onMouseMove(e: React.MouseEvent<HTMLCanvasElement, MouseEvent>) {
    if (!isDrawing || !start) return;
    const p = getMousePos(e);

    const xmin = Math.min(start.x, p.x);
    const ymin = Math.min(start.y, p.y);
    const xmax = Math.max(start.x, p.x);
    const ymax = Math.max(start.y, p.y);

    setCurrent({ xmin, ymin, xmax, ymax });
  }

  function onMouseUp() {
    if (!isDrawing || !current) {
      setIsDrawing(false);
      setStart(null);
      return;
    }

    if (current.xmax - current.xmin < 5 || current.ymax - current.ymin < 5) {
      setCurrent(null);
      setIsDrawing(false);
      setStart(null);
      return;
    }

    setBoxes((prev) => [...prev, current]);
    setCurrent(null);
    setIsDrawing(false);
    setStart(null);
  }

  function undo() {
    setBoxes((prev) => prev.slice(0, -1));
  }

  function clearAll() {
    setBoxes([]);
    setCurrent(null);
  }

  async function submit() {
    if (!user || !image) return;
    if (boxes.length === 0) {
      setMsg("Draw at least one box before submitting.");
      return;
    }

    const displayedW = imgRef.current?.clientWidth ?? 1;
    const displayedH = imgRef.current?.clientHeight ?? 1;

    const scaleX = image.width / displayedW;
    const scaleY = image.height / displayedH;

    const transformed = boxes.map((b) => ({
      xmin: Math.round(b.xmin * scaleX),
      ymin: Math.round(b.ymin * scaleY),
      xmax: Math.round(b.xmax * scaleX),
      ymax: Math.round(b.ymax * scaleY),
    }));

    await api.post("/labels", { imageId: image.id, boxes: transformed });

    setMsg("Submitted!");
    await loadNext();
  }

  return (
    <div className="app-container" style={{ fontFamily: "sans-serif", padding: 16, maxWidth: 900, margin: "0 auto" }}>
      <h2>The Spotter</h2>

      <AuthPanel
        user={user}
        email={email}
        password={password}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onLogin={login}
        onLogout={logout}
        onGetNextImage={loadNext}
      />

      {msg && <p>{msg}</p>}

      {user?.role === "Admin" && (
        <AdminDashboard
          adminStateFilter={adminStateFilter}
          onChangeFilter={setAdminStateFilter}
          adminImages={adminImages}
          selectedAdminImage={selectedAdminImage}
          adminLabels={adminLabels}
          onLoadAdminImages={loadAdminImages}
          onSelectAdminImage={selectAdminImage}
          onDeleteLabel={deleteLabel}
          onSetImageState={setImageState}
          adminImgRef={adminImgRef}
          adminCanvasRef={adminCanvasRef}
          onAdminImageLoad={() => setAdminLabels((prev) => [...prev])}
        />
      )}

      {user?.role === "Annotator" && image && (
        <div className="card" style={{ marginTop: 20 }}>
          <div style={{ marginBottom: 8 }}>
            <b>{image.filename}</b> (original: {image.width}×{image.height}) | boxes: {boxes.length}
          </div>

          <div
            style={{
              position: "relative",
              display: "inline-block",
              borderRadius: 8,
              overflow: "hidden",
              border: "1px solid #e5e7eb",
              background: "#fff",
            }}
          >
            <img
              ref={imgRef}
              src={image.url}
              alt="to-annotate"
              style={{ maxWidth: "800px", width: "100%", height: "auto", display: "block" }}
              onLoad={() => setBoxes((b) => [...b])}
            />
            <canvas
              ref={canvasRef}
              style={{ position: "absolute", left: 0, top: 0, cursor: "crosshair" }}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
            />
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button onClick={undo} disabled={boxes.length === 0}>
              Undo
            </button>
            <button onClick={clearAll} disabled={boxes.length === 0}>
              Clear
            </button>
            <button onClick={submit} disabled={!user || !image || boxes.length === 0}>
              Submit
            </button>
          </div>

          <p style={{ fontSize: 12, opacity: 0.75 }}>Green = currently drawing. Red = saved boxes.</p>
        </div>
      )}
    </div>
  );
}