import * as yup from "yup"

export const schemaFormData = yup.object({
  number_transaction: yup
    .string()
    .required("Số lượng giao dịch bắt buộc!")
    .matches(/^\d+$/, "Chỉ được nhập số, không được chứa ký tự chữ!"),

  min_sup: yup
    .string()
    .required("Ngưỡng hỗ trợ tối thiểu bắt buộc!")
    .matches(/^\d+(\.\d+)?$/, "Chỉ được nhập số hoặc số thực hợp lệ!"),

  min_confidence: yup
    .string()
    .required("Ngưỡng độ tin cậy tối thiểu bắt buộc!")
    .matches(/^\d+(\.\d+)?$/, "Chỉ được nhập số hoặc số thực hợp lệ!"),

  min_lift: yup
    .string()
    .required("Ngưỡng độ nâng tối thiểu bắt buộc!")
    .matches(/^\d+(\.\d+)?$/, "Chỉ được nhập số hoặc số thực hợp lệ!")
})

export const schemaFormDataRun = schemaFormData.pick(["min_sup", "min_lift", "min_confidence"]).shape({
  transactions: yup.string()
})

export type TypeSchemaFormData = yup.InferType<typeof schemaFormData>
export type TypeSchemaFormDataRun = yup.InferType<typeof schemaFormDataRun>
