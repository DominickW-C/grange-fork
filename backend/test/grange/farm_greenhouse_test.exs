defmodule Grange.FarmGreenhouseTest do
  @moduledoc false
  use ExUnit.Case, async: false

  import Grange.FarmFixtures

  alias Grange.{Barn, FarmGreenhouse, FarmStore, Inventory}

  setup do
    reset_farm_state()
    full_farm("Alice")
    Inventory.add("Alice", "wheat-seed", 5)
    Inventory.add("Alice", "seed-bag", 3)
    :ok
  end

  test "inserting seeds begins growing immediately and queues remaining stack" do
    now = 1_000_000

    assert {:ok, :ok} =
             FarmGreenhouse.action(
               "Alice",
               "Alice",
               %{
                 "kind" => "insert_seed",
                 "item" => "wheat-seed",
                 "count" => 3
               },
               now
             )

    state = FarmGreenhouse.state(FarmStore.view("Alice"))
    assert state["growing_crop"] == "wheat"
    assert state["ready_at"] == now + Grange.Farm.grow_ms()
    assert state["input_item"] == "wheat-seed"
    assert state["input_count"] == 2
    assert state["output_count"] == 0

    assert Inventory.seeds("Alice")["wheat-seed"] == 2
  end

  test "retrieving seeds returns queued seeds to inventory while active growth continues" do
    now = 1_000_000

    {:ok, :ok} =
      FarmGreenhouse.action(
        "Alice",
        "Alice",
        %{
          "kind" => "insert_seed",
          "item" => "wheat-seed",
          "count" => 3
        },
        now
      )

    assert {:ok, :ok} = FarmGreenhouse.action("Alice", "Alice", %{"kind" => "take_input"}, now)

    state = FarmGreenhouse.state(FarmStore.view("Alice"))
    assert state["growing_crop"] == "wheat"
    assert state["input_count"] == 0
    assert is_nil(state["input_item"])

    # Alice got the 2 queued seeds back
    assert Inventory.seeds("Alice")["wheat-seed"] == 4
  end

  test "ticker finishes crop, moves to output, and begins next queued seed" do
    now = 1_000_000
    grow_ms = Grange.Farm.grow_ms()

    {:ok, :ok} =
      FarmGreenhouse.action(
        "Alice",
        "Alice",
        %{
          "kind" => "insert_seed",
          "item" => "wheat-seed",
          "count" => 2
        },
        now
      )

    # Before completion: nothing changes
    assert FarmGreenhouse.tick(now + grow_ms - 1) == []

    # At completion: 1 wheat produced, 1 seed consumed to start growing next
    assert FarmGreenhouse.tick(now + grow_ms) == ["Alice"]

    state = FarmGreenhouse.state(FarmStore.view("Alice"))
    assert state["output_item"] == "wheat"
    assert state["output_count"] == 1
    assert state["growing_crop"] == "wheat"
    assert state["input_count"] == 0
    assert state["ready_at"] == now + grow_ms * 2

    # Advance second seed
    assert FarmGreenhouse.tick(now + grow_ms * 2) == ["Alice"]
    state2 = FarmGreenhouse.state(FarmStore.view("Alice"))
    assert state2["output_count"] == 2
    assert is_nil(state2["growing_crop"])
    assert is_nil(state2["ready_at"])
  end

  test "collecting output transfers crops to barn" do
    now = 1_000_000
    grow_ms = Grange.Farm.grow_ms()

    {:ok, :ok} =
      FarmGreenhouse.action(
        "Alice",
        "Alice",
        %{
          "kind" => "insert_seed",
          "item" => "seed-bag",
          "count" => 1
        },
        now
      )

    FarmGreenhouse.tick(now + grow_ms)

    assert {:ok, :ok} =
             FarmGreenhouse.action("Alice", "Alice", %{"kind" => "take_output"}, now + grow_ms)

    state = FarmGreenhouse.state(FarmStore.view("Alice"))
    assert state["output_count"] == 0
    assert is_nil(state["output_item"])
    assert Barn.map("Alice")["tomato"] == 1
  end

  test "cannot dig up greenhouse when items are inside or growing" do
    now = 1_000_000

    {:ok, :ok} =
      FarmGreenhouse.action(
        "Alice",
        "Alice",
        %{
          "kind" => "insert_seed",
          "item" => "wheat-seed",
          "count" => 1
        },
        now
      )

    assert {:error, "empty the greenhouse before moving it"} =
             FarmStore.prop_action("Alice", %{"kind" => "dig", "index" => 17})
  end
end
