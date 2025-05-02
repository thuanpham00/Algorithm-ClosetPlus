import { Pencil } from "lucide-react"
import { useState } from "react"
import { TypeSchemaFormDataRun } from "./rule"
import { ToastContainer } from "react-toastify"
import { MiningResult, TransactionType } from "./type"
import TreeNode from "./Components/Fptree"
import InputText from "./Components/InputText"
import InputFile from "./Components/InputFile"
import ExecutionStepItem from "./Components/Execution"

/**
  {
    "transactions": [
        ["a", "c", "t", "w"],
        ["c", "d", "w"],
        ["a", "c", "t", "w"],
        ["a", "c", "d", "w"],
        ["a", "c", "d", "t", "w"],
        ["c", "d", "t"]
    ],
    "min_sup": 3,
    "min_confidence": 0.8,
    "min_lift": 1.0
  }
   */

export type FormDataRun = Pick<TypeSchemaFormDataRun, "transactions" | "min_sup" | "min_lift" | "min_confidence">

function App() {
  const [typeInput, setTypeInput] = useState<"text" | "file">("text") // loại input // mặc định
  const [listTransaction, setListTransaction] = useState<TransactionType[]>([]) // danh sách giao dịch // nằm ở cpn cha truyền xuống con xử lý
  const [responseResult, setResponseResult] = useState<MiningResult | null>(null)

  const [file, setFile] = useState<File | null>(null)

  return (
    <div>
      <ToastContainer />
      <header className="bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#FCB045] py-2 shadow-lg">
        <div style={{ maxWidth: "1200px", width: "100%", margin: "20px auto" }}>
          <h1 className="text-2xl text-center font-bold text-white tracking-tight">
            Thuật toán CLOSET++<span className="text-yellow-300">.</span>
          </h1>
        </div>
      </header>

      <div
        style={{ maxWidth: "1200px", width: "100%", margin: "20px auto" }}
        className="p-8 border border-[#dedede] rounded-md shadow-xl bg-[#f2f2f2]"
      >
        <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#FCB045] text-transparent bg-clip-text">
          Tìm tập phổ biến đóng với CLOSET++
        </h2>

        <div className="flex items-center gap-2">
          <button
            className={`p-2 flex items-center gap-2 ${typeInput === "text" ? "border-b-2 border-b-purple-500" : ""} transition-all duration-300 ease-in-out`}
            type="button"
            onClick={() => {
              setTypeInput("text")
              setResponseResult(null)
              setListTransaction([])
            }}
          >
            <Pencil size={12} />
            <span
              className={`${typeInput === "text" ? "bg-gradient-to-r from-[#833AB4] to-[#FD1D1D] text-transparent bg-clip-text font-medium" : ""} transition-all duration-300 ease-in-out`}
            >
              Nhập thủ công
            </span>
          </button>
          <button
            className={`p-2 flex items-center gap-2 ${typeInput === "file" ? "border-b-2 border-b-purple-500" : ""} transition-all duration-300 ease-in-out`}
            type="button"
            onClick={() => {
              setTypeInput("file")
              setResponseResult(null)
              setListTransaction([])
            }}
          >
            <Pencil size={12} />
            <span
              className={`${typeInput === "file" ? "bg-gradient-to-r from-[#833AB4] to-[#FD1D1D] text-transparent bg-clip-text font-medium" : ""} transition-all duration-300 ease-in-out`}
            >
              Nhập với excel
            </span>
          </button>
        </div>

        {typeInput === "text" && (
          <InputText
            listTransaction={listTransaction}
            setListTransaction={setListTransaction}
            setResponseResult={setResponseResult}
          />
        )}
        {typeInput === "file" && <InputFile file={file} setFile={setFile} setResponseResult={setResponseResult} />}
      </div>

      {responseResult && (
        <div
          style={{ maxWidth: "1200px", width: "100%", margin: "20px auto" }}
          className="p-8 border border-[#dedede] rounded-lg shadow-xl bg-[#f2f2f2]"
        >
          <h2 className="text-center text-xl font-bold mb-2 bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#FCB045] text-transparent bg-clip-text">
            Kết quả
          </h2>

          <div>
            <div className="flex items-center gap-2 text-base">
              <span>
                1. Danh sách <strong>f_list</strong> đã được sắp xếp theo thứ tự giảm dần của độ hỗ trợ:
              </span>
              <span>
                {responseResult?.f_list.map((item) => {
                  const findItemCount = responseResult.fp_tree.item_counts[item]
                  return (
                    <span key={item}>
                      {item}:{findItemCount},{" "}
                    </span>
                  )
                })}
              </span>
            </div>

            <div>
              <h2>2. Xây dựng cây FP-tree Visualization</h2>
              {responseResult && <TreeNode node={responseResult.fp_tree.root} />}
            </div>

            <div className="mt-2 p-2 rounded-md border border-gray-400">
              <h2 className="font-semibold">Các bước thực thi:</h2>
              <div className="bg-[#f2f2f2]">
                {responseResult && responseResult.execution_steps.length > 0 ? (
                  responseResult.execution_steps.map((item, index) => (
                    <ExecutionStepItem index={index} key={index} step={item} level={0} />
                  ))
                ) : (
                  <p className="text-gray-500 italic">Không có dữ liệu để hiển thị.</p>
                )}
              </div>
            </div>

            <div className="mt-4 p-2 rounded-md border border-gray-400">
              <h2 className="font-semibold">Các luật kết hợp:</h2>
              <div className="bg-[#f2f2f2]">
                {responseResult &&
                  responseResult.association_rules.map((item) => {
                    return (
                      <div key={item.rule} className="py-2 relative">
                        <span className="absolute top-1/2 left-1 -translate-y-1/2 w-1 h-1 bg-black rounded-full"></span>
                        <span className="ml-4">{item.rule}</span>
                      </div>
                    )
                  })}
              </div>
            </div>

            <div className="mt-4 p-2 rounded-md border border-gray-400">
              <h2 className="font-semibold">Header table:</h2>
              <div className="bg-[#f2f2f2]">
                <table className="min-w-full border border-gray-300 mt-4">
                  <thead className="bg-gray-200">
                    <tr>
                      <th className="px-4 py-2 border">Item</th>
                      <th className="px-4 py-2 border">Count</th>
                      <th className="px-4 py-2 border">Path</th>
                    </tr>
                  </thead>
                  <tbody>
                    {responseResult &&
                      Object.entries(responseResult.fp_tree.header_table).map(([item, entries]) =>
                        entries.map((entry, idx) => (
                          <tr key={`${item}-${idx}`}>
                            <td className="border px-4 py-2">{item}</td>
                            <td className="border px-4 py-2">{entry.count}</td>
                            <td className="border px-4 py-2">{entry.path.join(" → ")}</td>
                          </tr>
                        ))
                      )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-4">
              <h2>3. Các tập hợp phổ biến mà ta tìm được:</h2>
              <div className="pl-4">
                {responseResult &&
                  responseResult.frequent_itemsets.map((item, index) => (
                    <span key={item.itemset} className="flex items-center gap-2">
                      <span>{index + 1}</span>
                      <strong>
                        {item.itemset}: {item.support} <br />
                      </strong>
                    </span>
                  ))}
              </div>
            </div>

            <div className="mt-4">
              <h2>4. Các tập hợp phổ biến đóng mà ta tìm được:</h2>
              <div className="pl-4">
                {responseResult &&
                  responseResult.closed_itemsets.map((item, index) => (
                    <span key={item.itemset} className="flex items-center gap-2">
                      <span>{index + 1}</span>
                      <strong>
                        {item.itemset}: {item.support} <br />
                      </strong>
                    </span>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
