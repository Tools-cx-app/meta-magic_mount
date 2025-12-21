import "./Skeleton.css";

interface SkeletonProps {
  width?: string;
  height?: string;
  borderRadius?: string;
  style?: string;
}

export default (props: SkeletonProps) => (
  <div
    class="skeleton"
    style={{
      "width": props.width ?? "100%",
      "height": props.height ?? "20px",
      "border-radius": props.borderRadius ?? "12px",
    }}
  />
);
