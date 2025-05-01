type FPNode = {
  item: string | null
  count: number
  children: FPNode[]
}

const colorPalette = [
  "#fb8500",
  "#ffb703",
  "#0077b6",
  "#a7c957",
  "#e3d5ca",
  "#bc4749",
  "#ff5400",
  "#c1121f",
  "#2b2d42",
  "#00f5d4",
  "#e4c1f9",
  "#7678ed",
  "#b2967d",
  "#0f4c5c"
]

function getRandomColor() {
  const randomIndex = Math.floor(Math.random() * colorPalette.length)
  return randomIndex
}

export default function TreeNode({ node }: { node: FPNode }) {
  const hasOneChild = node.children && node.children.length === 1
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
      {/* Node chính */}
      <div style={{ position: "relative", padding: 10 }}>
        {/* Đường nối từ cha xuống con */}
        {node.children?.length > 0 && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: "50%",
              width: 2,
              height: 20,
              backgroundColor: "#000",
              transform: "translateX(-50%)"
            }}
          />
        )}

        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: "50%",
            backgroundColor: colorPalette[getRandomColor()],
            color: "white",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            fontWeight: "bold"
          }}
        >
          {node.count === 0 ? "Root" : node.item + ":" + node.count}
        </div>
      </div>

      {/* Các node con nằm theo hàng ngang */}
      {node.children?.length > 0 && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 20, position: "relative" }}>
          {/* Đường ngang kết nối các node con */}
          {!hasOneChild && (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 1,
                width: "100%",
                backgroundColor: "#000"
              }}
            />
          )}

          {/* Hiển thị từng node con */}
          {node.children.map((child, index) => (
            <div
              key={index}
              style={{
                position: "relative",
                padding: "0 20px"
              }}
            >
              {/* Đường nối dọc từ đường ngang xuống con */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: "50%",
                  width: 2,
                  height: 20,
                  backgroundColor: "#000",
                  transform: "translateX(-50%)"
                }}
              />
              <TreeNode node={child} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
