import { describe, expect, it, vi } from "vitest"
import { screen, waitFor } from "@testing-library/react"
import { TripImageGallery } from "@/components/landing/trip-image-gallery"
import { renderWithIntl, userEvent } from "../utils/render"

vi.mock("next/image", () => ({
  default: function MockImage({
    alt,
    src,
    ...props
  }: {
    alt?: string
    src?: string
  }) {
    return <img alt={alt ?? ""} src={typeof src === "string" ? src : ""} {...props} />
  },
}))

describe("TripImageGallery", () => {
  it("shows a non-interactive placeholder when there are no photos", () => {
    renderWithIntl(<TripImageGallery images={[]} alt="Sunset kayak" />)

    expect(
      screen.queryByRole("button", { name: /view photos|view photo/i }),
    ).not.toBeInTheDocument()
  })

  it("opens the lightbox from the hero and lets you move between photos", async () => {
    const user = userEvent.setup()
    renderWithIntl(
      <TripImageGallery
        images={["/one.jpg", "/two.jpg", "/three.jpg"]}
        alt="Sunset kayak"
      />,
    )

    await user.click(screen.getByRole("button", { name: "View photos" }))

    expect(
      await screen.findByRole("dialog", { name: "Photos of Sunset kayak" }),
    ).toBeInTheDocument()
    expect(screen.getByText("1 / 3")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Next photo" }))
    await waitFor(() => {
      expect(screen.getByText("2 / 3")).toBeInTheDocument()
    })
  })

  it("shows a remaining-count overlay when there are more than four photos", () => {
    renderWithIntl(
      <TripImageGallery
        images={["/1.jpg", "/2.jpg", "/3.jpg", "/4.jpg", "/5.jpg", "/6.jpg"]}
        alt="Nile tour"
      />,
    )

    expect(screen.getByText("+2")).toBeInTheDocument()
  })
})
