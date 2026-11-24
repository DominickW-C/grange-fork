defmodule Grange.FarmGreenhouse do
  @moduledoc """
  Manages the greenhouse on a farm: converts planted seeds into produce over time
  in a furnace-style workflow (input stack -> growth timer -> output stack).
  """

  import Ecto.Query

  alias Grange.{Barn, Farm, FarmRecord, Inventory, Repo}

  @seed_to_crop %{
    "wheat-seed" => "wheat",
    "lettuce-seed" => "lettuce",
    "tomato-seed" => "tomato",
    "seed-bag" => "tomato",
    "midas-wheat-seed" => "midas_wheat",
    "frost-lettuce-seed" => "frost_lettuce",
    "sunburst-tomato-seed" => "sunburst_tomato"
  }

  @doc "The crop a seed item converts into, or nil."
  @spec seed_crop(String.t() | nil) :: String.t() | nil
  def seed_crop(seed), do: Map.get(@seed_to_crop, seed)

  @doc "Normalizes the stored greenhouse map for a farm struct."
  @spec state(FarmRecord.t() | map() | nil) :: map()
  def state(nil), do: default_state()

  def state(%FarmRecord{greenhouse: gh}) do
    Map.merge(default_state(), gh || %{})
  end

  def state(%{greenhouse: gh}) when is_map(gh) do
    Map.merge(default_state(), gh)
  end

  def state(_), do: default_state()

  defp default_state do
    %{
      "input_item" => nil,
      "input_count" => 0,
      "output_item" => nil,
      "output_count" => 0,
      "growing_crop" => nil,
      "ready_at" => nil,
      "grow_ms" => nil
    }
  end

  @doc "Whether the greenhouse holds any items or is currently growing a seed."
  @spec empty?(FarmRecord.t() | map() | nil) :: boolean()
  def empty?(farm) do
    gh = state(farm)
    gh["input_count"] == 0 and gh["output_count"] == 0 and is_nil(gh["growing_crop"])
  end

  @doc "Executes a greenhouse action within a database transaction."
  @spec action(String.t(), String.t(), map(), integer()) :: {:ok, :ok} | {:error, String.t()}
  def action(owner, actor, action_map, now \\ System.system_time(:millisecond)) do
    Repo.transaction(fn ->
      case Repo.get(FarmRecord, owner) do
        nil -> Repo.rollback("farm not found")
        farm -> commit_action(farm, actor, action_map, now)
      end
    end)
  end

  defp commit_action(farm, actor, action_map, now) do
    case apply_action(farm, actor, action_map, now) do
      {:ok, next_state} ->
        farm
        |> Ecto.Changeset.change(greenhouse: next_state)
        |> Repo.update!()

        :ok

      {:error, reason} ->
        Repo.rollback(reason)
    end
  end

  defp apply_action(farm, actor, %{"kind" => "insert_seed", "item" => item} = payload, now) do
    count = Map.get(payload, "count", 1)
    crop = seed_crop(item)

    cond do
      is_nil(crop) ->
        {:error, "invalid seed item"}

      not is_integer(count) or count < 1 ->
        {:error, "invalid seed count"}

      true ->
        with :ok <- Inventory.take(actor, item, count) do
          insert_into_greenhouse(state(farm), item, crop, count, now)
        end
    end
  end

  defp apply_action(farm, _actor, %{"kind" => "take_output"}, _now) do
    gh = state(farm)
    count = gh["output_count"]
    item = gh["output_item"]

    if count > 0 and not is_nil(item) do
      :ok = Barn.add(farm.owner, item, count)
      {:ok, Map.merge(gh, %{"output_item" => nil, "output_count" => 0})}
    else
      {:error, "no output to collect"}
    end
  end

  defp apply_action(farm, actor, %{"kind" => "take_input"}, _now) do
    gh = state(farm)
    count = gh["input_count"]
    item = gh["input_item"]

    if count > 0 and not is_nil(item) do
      _ = Inventory.add(actor, item, count)
      {:ok, Map.merge(gh, %{"input_item" => nil, "input_count" => 0})}
    else
      {:error, "no queued seeds to retrieve"}
    end
  end

  defp apply_action(_farm, _actor, _unknown, _now), do: {:error, "unknown greenhouse action"}

  defp insert_into_greenhouse(gh, item, crop, count, now) do
    cond do
      is_nil(gh["growing_crop"]) ->
        grow_ms = Farm.grow_ms()
        remainder = count - 1

        next = %{
          gh
          | "growing_crop" => crop,
            "ready_at" => now + grow_ms,
            "grow_ms" => grow_ms,
            "input_item" => if(remainder > 0, do: item, else: nil),
            "input_count" => remainder
        }

        {:ok, next}

      gh["growing_crop"] == crop ->
        next = %{
          gh
          | "input_item" => item,
            "input_count" => gh["input_count"] + count
        }

        {:ok, next}

      true ->
        {:error, "another crop is currently growing"}
    end
  end

  @doc """
  Processes active greenhouses across all farms whose currently growing crop
  has reached its ready timestamp.
  """
  @spec tick(integer()) :: [String.t()]
  def tick(now \\ System.system_time(:millisecond)) do
    Repo.all(from(f in FarmRecord))
    |> Enum.filter(&needs_tick?(&1, now))
    |> Enum.map(&process_tick(&1, now))
  end

  defp needs_tick?(farm, now) do
    gh = state(farm)
    not is_nil(gh["growing_crop"]) and not is_nil(gh["ready_at"]) and gh["ready_at"] <= now
  end

  defp process_tick(farm, now) do
    next = advance_greenhouse(state(farm), now)

    farm
    |> Ecto.Changeset.change(greenhouse: next)
    |> Repo.update!()

    farm.owner
  end

  defp advance_greenhouse(gh, now) do
    crop = gh["growing_crop"]
    out_item = gh["output_item"] || crop
    out_count = gh["output_count"] + 1
    input_count = gh["input_count"]
    input_item = gh["input_item"]

    if input_count > 0 do
      grow_ms = Farm.grow_ms()
      remainder = input_count - 1

      %{
        gh
        | "output_item" => out_item,
          "output_count" => out_count,
          "growing_crop" => crop,
          "ready_at" => now + grow_ms,
          "grow_ms" => grow_ms,
          "input_item" => if(remainder > 0, do: input_item, else: nil),
          "input_count" => remainder
      }
    else
      %{
        gh
        | "output_item" => out_item,
          "output_count" => out_count,
          "growing_crop" => nil,
          "ready_at" => nil,
          "grow_ms" => nil,
          "input_item" => nil,
          "input_count" => 0
      }
    end
  end
end
