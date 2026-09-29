"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field, Textarea } from "@/components/ui/field";
import { StarInput } from "@/components/ui/signals";
import { errorMessage, useCreateReview } from "@/lib/queries";
import { ReviewInputSchema } from "@/lib/schemas";
import { t } from "@/messages/en";

export function ReviewDialog({ orderId, title }: { orderId: string; title: string }) {
  const [open, setOpen] = React.useState(false);
  const [rating, setRating] = React.useState(0);
  const [text, setText] = React.useState("");
  const [errors, setErrors] = React.useState<{ rating?: string; text?: string }>({});
  const create = useCreateReview();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = ReviewInputSchema.safeParse({ rating, text: text.trim() });
    if (!parsed.success) {
      const next: typeof errors = {};
      for (const issue of parsed.error.issues) next[issue.path[0] as "rating" | "text"] ??= issue.message;
      setErrors(next);
      return;
    }
    setErrors({});
    try {
      await create.mutateAsync({ orderId, ...parsed.data });
      toast.success(t.review.posted);
      setOpen(false);
      setRating(0);
      setText("");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">{t.me.writeReview}</Button>
      </DialogTrigger>
      <DialogContent title={t.review.title(title)}>
        <form onSubmit={submit} noValidate className="flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <StarInput name={`rating-${orderId}`} value={rating} onChange={setRating} labels={t.review.star} legend={t.review.rating} />
            {errors.rating ? (
              <p role="alert" className="text-sm text-live">
                {errors.rating}
              </p>
            ) : null}
          </div>
          <Field label={t.review.text} htmlFor={`review-${orderId}`} error={errors.text} hint={`${text.trim().length} of 500`}>
            <Textarea
              id={`review-${orderId}`}
              value={text}
              maxLength={500}
              onChange={(e) => setText(e.target.value)}
              placeholder={t.review.textPlaceholder}
              aria-invalid={Boolean(errors.text)}
              aria-describedby={errors.text ? `review-${orderId}-error` : `review-${orderId}-hint`}
            />
          </Field>
          <Button type="submit" size="lg" disabled={create.isPending}>
            {create.isPending ? "Posting" : t.review.cta}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
