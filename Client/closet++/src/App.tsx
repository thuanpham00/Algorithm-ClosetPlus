import { Pencil, Plus, Trash } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { schemaFormData, TypeSchemaFormData, TypeSchemaFormDataRun } from "./rule"
import { yupResolver } from "@hookform/resolvers/yup"
import { ToastContainer, toast } from "react-toastify"
import axios from "axios"

const formData = schemaFormData.pick(["numberTransaction", "min_sup", "min_confidence", "min_lift"])

type FormData = Pick<TypeSchemaFormData, "numberTransaction" | "min_sup" | "min_lift" | "min_confidence">

type FormDataRun = Pick<TypeSchemaFormDataRun, "transactions" | "min_sup" | "min_lift" | "min_confidence">

type TransactionType = {
  id: string
  listItem: string
}

function App() {
  const [typeInput, setTypeInput] = useState("text")
  const [listTransaction, setListTransaction] = useState<TransactionType[]>([])

  const { handleSubmit, register, watch } = useForm<FormData>({ resolver: yupResolver(formData) })

  const handleSubmitForm = handleSubmit(
    (data) => {
      const n = Number(data.numberTransaction)
      const arr = Array.from({ length: n }, (_, i) => i + 1)

      const listTrans = arr.map((item) => {
        const res = {
          id: "T" + item,
          listItem: ""
        }
        return res
      })

      setListTransaction(listTrans)
    },
    (errors) => {
      if (errors.numberTransaction) {
        toast.error(errors.numberTransaction.message, { autoClose: 1500 })
      }
      if (errors.min_sup) {
        toast.error(errors.min_sup.message, { autoClose: 1500 })
      }
      if (errors.min_confidence) {
        toast.error(errors.min_confidence.message, { autoClose: 1500 })
      }
      if (errors.min_lift) {
        toast.error(errors.min_lift.message, { autoClose: 1500 })
      }
    }
  )

  const minSup = watch("min_sup")
  const minConfidence = watch("min_confidence")
  const minLift = watch("min_lift")
  console.log(minSup, minLift, minConfidence)

  const handleChangeList = (idTransaction: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const updatedList = listTransaction.map((item) => {
      if (item.id === idTransaction) {
        return {
          ...item,
          listItem: event.target.value
        }
      }
      return item
    })
    setListTransaction(updatedList)
  }

  const handleAddTransaction = () => {
    const listTransactionNew = [...listTransaction]
    const lengthCurrent = listTransactionNew.length + 1
    listTransactionNew.push({ id: "T" + lengthCurrent, listItem: "" })
    setListTransaction(listTransactionNew)
  }

  const handleDeleteItem = (idItem: string) => {
    const listTransactionNew = listTransaction.filter((item) => item.id !== idItem)
    setListTransaction(listTransactionNew)
  }

  /**
   * {
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

  const { handleSubmit: handleSubmitRunCloset } = useForm<FormDataRun>()

  const handleSubmitRunClosetPlus = handleSubmitRunCloset(() => {
    const getItemFromTransaction = listTransaction.map((item) => {
      const normalizedString = item.listItem
        .trim() // Loại bỏ khoảng trắng thừa ở đầu và cuối chuỗi
        .replace(/\s*,\s*/g, ",") // Thay thế dấu phẩy (có hoặc không có khoảng trắng) bằng dấu phẩy chuẩn

      // Bước 2: Tách chuỗi thành mảng
      const splitItem = normalizedString
        .split(",") // Tách bằng dấu phẩy
        .map((i) => i.trim()) // Loại bỏ khoảng trắng thừa ở mỗi item
        .filter((i) => i !== "") // Loại bỏ các phần tử rỗng
      return splitItem
    })
    const body = {
      transactions: getItemFromTransaction,
      min_sup: parseFloat(minSup),
      min_confidence: parseFloat(minConfidence),
      min_lift: parseFloat(minLift)
    }
    console.log(body)
    axios
      .post("http://localhost:8000/mine", body, {
        headers: {
          "Content-Type": "application/json"
        }
      })
      .then((response) => {
        console.log("Dữ liệu:", response.data)
      })
      .catch((error) => {
        console.error("Lỗi:", error)
      })
  })

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
        className="p-8 border border-[#dedede] rounded-md"
      >
        <h1 className="text-2xl font-bold mb-2 bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#FCB045] text-transparent bg-clip-text">
          Tìm tập phổ biến đóng với CLOSET++
        </h1>

        <div className="flex items-center gap-2">
          <button
            className={`p-2 flex items-center gap-2 ${typeInput === "text" ? "border-b-2 border-b-purple-500" : ""} transition-all duration-300 ease-in-out`}
            type="button"
            onClick={() => setTypeInput("text")}
          >
            <Pencil size={12} />
            <span
              className={`${typeInput === "text" ? "bg-gradient-to-r from-[#833AB4] to-[#FD1D1D] text-transparent bg-clip-text font-medium" : ""} transition-all duration-300 ease-in-out`}
            >
              Nhập thủ công
            </span>
          </button>
          <button
            className={`p-2 flex items-center gap-2 ${typeInput === "excel" ? "border-b-2 border-b-purple-500" : ""} transition-all duration-300 ease-in-out`}
            type="button"
            onClick={() => setTypeInput("excel")}
          >
            <Pencil size={12} />
            <span
              className={`${typeInput === "excel" ? "bg-gradient-to-r from-[#833AB4] to-[#FD1D1D] text-transparent bg-clip-text font-medium" : ""} transition-all duration-300 ease-in-out`}
            >
              Nhập với excel
            </span>
          </button>
        </div>
        {typeInput === "text" && (
          <div className="mt-4">
            <form onSubmit={handleSubmitForm}>
              <div className="flex items-center justify-between w-[500px]">
                <span>Số lượng giao dịch</span>
                <input
                  placeholder="Nhập số giao dịch"
                  className="p-2 border border-gray-300 rounded-md min-w-[300px]"
                  {...register("numberTransaction")}
                />
              </div>
              <div className="mt-2 flex items-center justify-between w-[500px]">
                <span>Ngưỡng hỗ trợ tối thiểu</span>
                <input
                  placeholder="Nhập ngưỡng hỗ trợ tối thiểu"
                  className="p-2 border border-gray-300 rounded-md min-w-[300px]"
                  {...register("min_sup")}
                />
              </div>
              <div className="mt-2 flex items-center justify-between w-[500px]">
                <span>Ngưỡng độ tin cậy tối thiểu</span>
                <input
                  placeholder="Nhập ngưỡng độ tin cậy tối thiểu"
                  className="p-2 border border-gray-300 rounded-md min-w-[300px]"
                  {...register("min_confidence")}
                />
              </div>
              <div className="mt-2 flex items-center justify-between w-[500px]">
                <span>Ngưỡng độ nâng tối thiểu.</span>
                <input
                  placeholder="Nhập ngưỡng độ tin cậy tối thiểu"
                  className="p-2 border border-gray-300 rounded-md min-w-[300px]"
                  {...register("min_lift")}
                />
              </div>
              <button
                type="submit"
                className="py-2 px-4 bg-blue-500 rounded-md text-sm text-white hover:bg-blue-400 duration-300"
              >
                Tạo giao dịch
              </button>
            </form>

            {listTransaction.length > 0 && (
              <form onSubmit={handleSubmitRunClosetPlus} className="mt-4">
                <table
                  style={{ border: "1px solid black", borderCollapse: "collapse" }}
                  cellSpacing="0"
                  cellPadding="4"
                >
                  <thead>
                    <tr>
                      <th style={{ border: "1px solid black" }}>TID (ID giao dịch)</th>
                      <th style={{ border: "1px solid black" }}>Danh sách</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listTransaction.map((transaction) => {
                      return (
                        <tr key={transaction.id}>
                          <td style={{ border: "1px solid black" }}>{transaction.id}</td>
                          <td style={{ border: "1px solid black", width: "250px" }}>
                            <input
                              type="text"
                              value={transaction.listItem}
                              onChange={handleChangeList(transaction.id)}
                              className="px-2 py-1 w-full outline-none bg-[#f2f2f2]"
                            />
                          </td>
                          <td style={{ border: "1px solid black" }}>
                            <button
                              className="p-1 bg-red-100 rounded-full"
                              onClick={() => handleDeleteItem(transaction.id)}
                            >
                              <Trash size={14} color="red" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                <button
                  className="text-blue-500 text-right w-[410px] flex items-center justify-end hover:text-blue-400 duration-200 text-[14px] mt-1"
                  onClick={handleAddTransaction}
                >
                  <Plus size={14} />
                  Thêm giao dịch
                </button>

                <button
                  type="submit"
                  className="mt-4 block px-4 py-2 rounded-md bg-blue-500 text-white hover:bg-blue-400 duration-200"
                >
                  Chạy thuật toán
                </button>
              </form>
            )}
          </div>
        )}
        {typeInput === "excel" && <div>Nhập thủ công</div>}
      </div>
    </div>
  )
}

export default App
