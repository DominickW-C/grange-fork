defmodule Grange.Hub do
  @moduledoc """
  Rules for the shared hub areas where players see each other.

  The marketplace and casino broadcast player presence; farms are private and
  never join a hub. Hub positions are cosmetic, so this module only validates
  the area and clamps coordinates into the map. It is not a movement authority.
  """

  @areas ~w(marketplace casino)
  @map_width 1152
  @map_height 768
  @edge_x 16
  @edge_top 32
  @edge_bottom 16

  @doc "The hub areas that broadcast player presence."
  def areas, do: @areas

  @doc "Whether `area` is a shared hub area."
  def area?(area), do: area in @areas

  @doc """
  Clamps a reported hub position into the walkable map bounds.

  Returns `:error` when either coordinate is not a number.
  """
  def clamp_position(x, y) when is_number(x) and is_number(y) do
    {:ok,
     {
       clamp(x, @edge_x, @map_width - @edge_x),
       clamp(y, @edge_top, @map_height - @edge_bottom)
     }}
  end

  def clamp_position(_x, _y), do: :error

  defp clamp(value, minimum, maximum), do: value |> max(minimum) |> min(maximum)
end
