import { ExecutionStep } from "src/type"

export default function ExecutionStepItem({
  index,
  step,
  level = 0
}: {
  index: number
  step: ExecutionStep
  level?: number
}) {
  return (
    <div className={`ml-${level * 4} py-1 relative`}>
      <div className={`${level === 0 ? "ml-20" : "ml-4"}`}>
        {/* các bước step */}
        {step.step && (
          <h3 className={`font-semibold text-${level === 0 ? "lg" : "base"} text-gray-800 mb-1 relative`}>
            {step.step}

            <span className="absolute top-1/2 -left-[66px] -translate-y-1/2">Bước {index + 1}: </span>
          </h3>
        )}

        {/* Nếu là sub-step (có "description" và/hoặc "details") */}
        {step.description && (
          <div className="text-gray-600">
            <span className="ml-2 relative">
              {step.description}
              <span className="absolute top-1/2 -left-4 -translate-y-1/2 w-[6px] h-[6px] bg-gray-500 rounded-full"></span>
            </span>
            {step.details && <span className="text-black-500 font-semibold italic ml-2 ">- {step.details}</span>}
          </div>
        )}

        {/* Đệ quy để hiển thị các sub-steps nếu có */}
        {step.sub_steps && step.sub_steps.length > 0 && (
          <div className="mt-1">
            {step.sub_steps.map((subStep, index) => (
              <ExecutionStepItem index={index} key={index} step={subStep} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
