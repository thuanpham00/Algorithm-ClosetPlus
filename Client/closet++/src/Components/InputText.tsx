import { yupResolver } from "@hookform/resolvers/yup"
import axios from "axios"
import { Plus, Trash } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "react-toastify"
import { FormDataRun } from "src/App"
import { schemaFormData, TypeSchemaFormData } from "src/rule"
import { MiningResult, TransactionType } from "src/type"

const formData = schemaFormData.pick(["numberTransaction", "min_sup", "min_confidence", "min_lift"])

type FormData = Pick<TypeSchemaFormData, "numberTransaction" | "min_sup" | "min_lift" | "min_confidence">

interface Props {
  listTransaction: TransactionType[]
  setListTransaction: React.Dispatch<React.SetStateAction<TransactionType[]>>
  setResponseResult: React.Dispatch<React.SetStateAction<MiningResult | null>>
}

export default function InputText({ listTransaction, setListTransaction, setResponseResult }: Props) {
  const [inputMinSup, setInputMinSup] = useState<number>()
  const [inputMinConfidence, setInputMinConfidence] = useState<number>()
  const [inputMinLift, setInputMinLift] = useState<number>()

  const { handleSubmit, register } = useForm<FormData>({ resolver: yupResolver(formData) })
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
      setInputMinSup(parseFloat(data.min_sup))
      setInputMinConfidence(parseFloat(data.min_confidence))
      setInputMinLift(parseFloat(data.min_lift))
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

  const { handleSubmit: handleSubmitRunCloset } = useForm<FormDataRun>()
  const handleSubmitRunClosetPlus = handleSubmitRunCloset(async () => {
    const getItemFromTransaction = listTransaction.map((item) => {
      const normalizedString = item.listItem.trim().replace(/\s*,\s*/g, ",") // Thay thế dấu phẩy (có hoặc không có khoảng trắng) bằng dấu phẩy chuẩn

      const splitItem = normalizedString
        .split(",") // Tách bằng dấu phẩy
        .map((i) => i.trim()) // Loại bỏ khoảng trắng thừa ở mỗi item
        .filter((i) => i !== "") // Loại bỏ các phần tử rỗng
      return splitItem
    })
    const body = {
      transactions: getItemFromTransaction,
      min_sup: inputMinSup,
      min_confidence: inputMinConfidence,
      min_lift: inputMinLift
    }

    try {
      const res = await axios.post("http://localhost:8000/mine", body, {
        headers: {
          "Content-Type": "application/json"
        }
      })
      setResponseResult(res.data as MiningResult)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error(error)
    }
  })

  return (
    <div className="mt-4">
      <form onSubmit={handleSubmitForm}>
        <div className="flex items-center justify-between w-[500px]">
          <span className="text-[14px]">Số lượng giao dịch:</span>
          <input
            placeholder="Nhập số giao dịch"
            className="p-2 border border-gray-300 rounded-md min-w-[300px] text-[14px]"
            {...register("numberTransaction")}
          />
        </div>
        <div className="mt-2 flex items-center justify-between w-[500px]">
          <span className="text-[14px]">Ngưỡng hỗ trợ tối thiểu:</span>
          <input
            placeholder="Nhập ngưỡng hỗ trợ tối thiểu"
            className="p-2 border border-gray-300 rounded-md min-w-[300px] text-[14px]"
            {...register("min_sup")}
          />
        </div>
        <div className="mt-2 flex items-center justify-between w-[500px]">
          <span className="text-[14px]">Ngưỡng độ tin cậy tối thiểu:</span>
          <input
            placeholder="Nhập ngưỡng độ tin cậy tối thiểu"
            className="p-2 border border-gray-300 rounded-md min-w-[300px] text-[14px]"
            {...register("min_confidence")}
          />
        </div>
        <div className="mt-2 flex items-center justify-between w-[500px]">
          <span className="text-[14px]">Ngưỡng độ nâng tối thiểu:</span>
          <input
            placeholder="Nhập ngưỡng độ tin cậy tối thiểu"
            className="p-2 border border-gray-300 rounded-md min-w-[300px] text-[14px]"
            {...register("min_lift")}
          />
        </div>
        <button
          type="submit"
          className="mt-2 py-2 px-4 bg-blue-500 rounded-md text-sm text-white hover:bg-blue-400 duration-300"
        >
          Tạo giao dịch
        </button>
      </form>

      {listTransaction.length > 0 && (
        <div>
          <form onSubmit={handleSubmitRunClosetPlus} className="mt-4">
            <table style={{ border: "1px solid black", borderCollapse: "collapse" }} cellSpacing="0" cellPadding="4">
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
        </div>
      )}
    </div>
  )
}
