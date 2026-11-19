defmodule Grange.ChatTest do
  @moduledoc false
  use ExUnit.Case, async: true

  alias Grange.Chat

  test "trims and collapses whitespace into one line" do
    assert {:ok, "hello there"} = Chat.normalize("  hello \n\t there  ")
  end

  test "rejects empty and whitespace-only text" do
    assert {:error, "message is empty"} = Chat.normalize("")
    assert {:error, "message is empty"} = Chat.normalize("   \n\t ")
  end

  test "rejects non-string payloads" do
    assert {:error, "invalid message"} = Chat.normalize(nil)
    assert {:error, "invalid message"} = Chat.normalize(42)
    assert {:error, "invalid message"} = Chat.normalize(%{"text" => "hi"})
  end

  test "accepts the maximum length and rejects one character more" do
    max = Chat.max_length()

    assert {:ok, _} = Chat.normalize(String.duplicate("a", max))
    assert {:error, "message is too long"} = Chat.normalize(String.duplicate("a", max + 1))
  end

  test "drops control characters" do
    assert {:ok, "hi there"} = Chat.normalize("hi\u0000 there\u0007")
  end

  test "stamps chat lines with the author, text, and a millisecond time" do
    line = Chat.line_payload("Alice", "hello")

    assert line.author == "Alice"
    assert line.text == "hello"
    assert is_integer(line.at)
  end

  test "throttles a burst and reopens once the window passes" do
    times =
      Enum.reduce(1..5, [], fn _, acc ->
        {:ok, next} = Chat.throttle(acc, 1_000)
        next
      end)

    assert {:error, :slow_down} = Chat.throttle(times, 1_001)
    # 4500ms is outside the 3000ms window, so the old sends fall away.
    assert {:ok, [4_500]} = Chat.throttle(times, 4_500)
  end

  test "forgets sends outside the window" do
    assert {:ok, [10_000]} = Chat.throttle([1_000, 2_000], 10_000)
  end
end
