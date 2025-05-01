/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios"
import { useRef } from "react"
import { useForm } from "react-hook-form"
import { FormDataRun } from "src/App"
import { ExcelData, MiningResult } from "src/type"
import * as XLSX from "xlsx"

interface Props {
  setResponseResult: React.Dispatch<React.SetStateAction<MiningResult | null>>
  file: File | null
  setFile: React.Dispatch<React.SetStateAction<File | null>>
}

export default function InputFile({ setResponseResult, file, setFile }: Props) {
  const refInput = useRef<HTMLInputElement>(null)

  const handleClickRef = () => {
    refInput.current?.click()
  }

  const handleChangeFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileChoose = event.target.files?.[0] as File
    if (fileChoose) {
      setFile(fileChoose)
    }
  }

  const readExcelFiles = async (file: File): Promise<ExcelData> => {
    const allTransactions: string[][] = []
    let minSup: number | undefined
    let minConfidence: number | undefined
    let minLift: number | undefined

    const data = await file.arrayBuffer()
    const workbook = XLSX.read(data)

    // Đọc sheet đầu tiên (dữ liệu giao dịch)
    const transactionSheetName = workbook.SheetNames[0]
    const transactionWorksheet = workbook.Sheets[transactionSheetName]
    const transactionData = XLSX.utils.sheet_to_json(transactionWorksheet, { header: 1 }) as any[][]

    // Bỏ qua hàng tiêu đề (hàng 1: "Transaction") và đọc cột "Transaction"
    const transactions = transactionData.slice(1).map((row) => {
      const transactionString = row[0]
      if (!transactionString || typeof transactionString !== "string") return []

      // Chuẩn hóa chuỗi giao dịch
      const normalizedString = transactionString.trim().replace(/\s*,\s*/g, ",")

      const splitItems = normalizedString
        .split(",")
        .map((i) => i.trim())
        .filter((i) => i !== "")

      return splitItems
    })

    // Thêm các giao dịch từ file này vào danh sách tổng
    allTransactions.push(...transactions.filter((trans) => trans.length > 0))

    // Đọc sheet thứ 2 (tham số)
    if (workbook.SheetNames.length > 1) {
      const paramSheetName = workbook.SheetNames[1]
      const paramWorksheet = workbook.Sheets[paramSheetName]
      const paramData = XLSX.utils.sheet_to_json(paramWorksheet, { header: 1 }) as any[][]

      // Đọc các tham số từ sheet thứ 2
      paramData.slice(1).forEach((row) => {
        const param = row[0]?.toLowerCase()
        const value = row[1]

        if (param === "min_sup") minSup = Number(value)
        if (param === "min_confidence") minConfidence = Number(value)
        if (param === "min_lift") minLift = Number(value)
      })
    }

    // Kiểm tra xem các tham số có được đọc thành công không
    if (minSup === undefined || minConfidence === undefined || minLift === undefined) {
      throw new Error("Không tìm thấy đầy đủ các tham số min_sup, min_confidence, min_lift trong file Excel")
    }

    return {
      transactions: allTransactions,
      min_sup: minSup,
      min_confidence: minConfidence,
      min_lift: minLift
    }
  }

  const { handleSubmit: handleSubmitRunCloset2 } = useForm<FormDataRun>()

  const handleSubmitRunClosetPlusFile = handleSubmitRunCloset2(async () => {
    if (!file) {
      alert("Vui lòng chọn ít nhất một file Excel!")
      return
    }

    try {
      const { transactions, min_sup, min_confidence, min_lift } = await readExcelFiles(file)

      if (transactions.length === 0) {
        alert("Không có giao dịch hợp lệ trong các file đã chọn!")
        return
      }

      const body = {
        transactions,
        min_sup,
        min_confidence,
        min_lift
      }

      console.log("Dữ liệu gửi đi:", body)

      // Gọi API
      const res = await axios.post("http://localhost:8000/mine", body, {
        headers: {
          "Content-Type": "application/json"
        }
      })

      setResponseResult(res.data as MiningResult)
    } catch (error: any) {
      console.error("Lỗi:", error)
      alert("Có lỗi xảy ra: " + (error.message || "Không xác định"))
    }
  })

  return (
    <form onSubmit={handleSubmitRunClosetPlusFile} className="mt-2">
      <button className="p-2 px-4 bg-blue-500 rounded-md text-white text-[14px]" onClick={handleClickRef}>
        Chọn file
      </button>
      <input
        type="file"
        className="hidden"
        multiple
        accept=".xlsx,.xls"
        ref={refInput}
        onClick={(event) => {
          ;(event.target as any).value = null
        }}
        onChange={handleChangeFile}
      />
      {file && (
        <div>
          <div className="mt-2 text-[13px] text-gray-500">{file.name}</div>
          <button className="p-2 px-4 bg-blue-500 text-white rounded-md text-[14px] mt-2">Chạy thuật toán</button>
        </div>
      )}
    </form>
  )
}
