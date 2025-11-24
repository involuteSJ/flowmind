import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { UserPlus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'

const signupFormSchema = z.object({
  email: z.string().email('올바른 이메일 주소를 입력해주세요'),
  name: z.string().min(2, '이름은 최소 2자 이상이어야 합니다'),
  phone: z.string()
    .min(10, '전화번호는 최소 10자 이상이어야 합니다')
    .regex(/^[0-9]+$/, '올바른 전화번호를 입력해주세요 (숫자만 사용 가능)'),
  password: z.string().min(6, '비밀번호는 최소 6자 이상이어야 합니다'),
  passwordCheck: z.string(),
}).refine((data) => data.password === data.passwordCheck, {
  message: '비밀번호가 일치하지 않습니다',
  path: ['passwordCheck'],
})

type SignupFormValues = z.infer<typeof signupFormSchema>

interface SignupModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SignupModal({ open, onOpenChange }: SignupModalProps) {
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: {
      email: '',
      name: '',
      phone: '',
      password: '',
      passwordCheck: '',
    },
  })

  const onSubmit = async (values: SignupFormValues) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('http://localhost:8080/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values), // { email, password }
      })

      if (!response.ok) {
        // 서버에서 에러 메시지를 보낸다면 우선 텍스트로 읽어봄
        const message = await response.text()
        throw new Error(message || '회원가입에 실패했습니다.')
      }

      const data = await response.json()

      // 백엔드 응답 형식에 맞게 수정하면 됨
      // 예: { token: 'JWT_TOKEN', ... }
      if (data.token) {
        localStorage.setItem('accessToken', data.token)
      }

      // 회원가입 성공 후 모달 닫기 + 폼 초기화
      onOpenChange(false)
      form.reset()
    } catch (err: any) {
      console.error('회원가입 실패:', err)
      setError(err?.message ?? '회원가입 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            회원가입
          </DialogTitle>
          <DialogDescription>
            계정을 생성하기 위해 정보를 입력해주세요.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>이메일</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="example@email.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>이름</FormLabel>
                  <FormControl>
                    <Input placeholder="홍길동" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>전화번호</FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      placeholder="010-1234-5678"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>비밀번호</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="passwordCheck"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>비밀번호 확인</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                취소
              </Button>
              <Button type="submit">회원가입</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

