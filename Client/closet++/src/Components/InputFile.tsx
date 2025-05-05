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
    let minSup: number | undefined = 0
    let minConfidence: number | undefined = 0
    let minLift: number | undefined = 0

    const data = await file.arrayBuffer()
    const workbook = XLSX.read(data)

    // Đọc sheet đầu tiên (dữ liệu giao dịch)
    const sheetName = workbook.SheetNames[0]
    const workSheet = workbook.Sheets[sheetName]
    const sheetData = XLSX.utils.sheet_to_json(workSheet, { header: 1 }) as any[][]

    const paramRow = sheetData[1] // Hàng 2 (chỉ số 1)
    minSup = Number(paramRow[1]) // Cột B (min_sup)
    minConfidence = Number(paramRow[2]) // Cột C (min_confidence)
    minLift = Number(paramRow[3]) // Cột D (min_lift)

    // Bỏ qua hàng tiêu đề (hàng 1: "Transaction") và đọc cột "Transaction"
    const transactions = sheetData.slice(1).map((row) => {
      const transactionString = row[0] // Cột A
      if (!transactionString || typeof transactionString !== "string") return []

      // Chuẩn hóa chuỗi giao dịch
      const normalizedString = transactionString.trim().replace(/\s*,\s*/g, ",")

      const splitItems = normalizedString
        .split(",")
        .map((i) => i.trim())
        .filter((i) => i !== "")

      return splitItems
    })
    allTransactions.push(...transactions.filter((trans) => trans.length > 0))

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
      const res = await axios.post("http://localhost:8999/mine", body, {
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
      <div className="flex justify-start gap-2">
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
        {file && <div className="mt-2 text-[13px] text-gray-500">{file.name}</div>}
      </div>
      {file && <button className="p-2 px-4 bg-blue-500 text-white rounded-md text-[14px] mt-2">Chạy thuật toán</button>}
    </form>
  )
}
